import { UploadData } from './../../../models/site.model';
import { ConfirmDialog } from './../../../components/dialogs/confirm';
import { SiteManager } from './../../site-manager';
import { inject, bindable, observable } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import * as moment from 'moment';
import { ThreeSiteModel } from 'internal';
import { SitesTool } from './../sites-tool';
import { jsonify } from 'aurelia-deco';

interface Stat {
  id: string;
  originalFile: string;
  date: string;
  count: number;
  selected?: boolean;
}
@inject(EventAggregator, SitesTool)
export class SiteObjectsStats {

  @bindable siteManager: SiteManager;

  private activityId: string;
  private subs: Subscription[] = [];
  public stats: Stat[] = [];
  public total: number;

  @observable
  public totalSelected = false;
  public somethingSelected = false;

  public constructor(private eventAggregator: EventAggregator, private sitesTool: SitesTool) {}

  public attached(): void {
    this.fetchStats();
    this.subs.push(this.eventAggregator.subscribe('aurelia-three:uploaded-objects', () => {
      this.fetchStats();
    }));
  }

  public detached(): void {
    for (const sub of this.subs) {
      sub.dispose();
    }
    this.subs = [];
  }

  private async fetchStats(): Promise<void> {
    const stats: Stat[] = await ThreeSiteModel.api.get(`/three/site/${this.siteManager.siteId}/stats`).then(jsonify);
    stats.map(s => s.selected = false);
    stats.sort((a, b) => {
      const ma = moment(a.date, 'DD/MM/YYYY HH:mm:ss');
      const mb = moment(b.date, 'DD/MM/YYYY HH:mm:ss');
      if (ma.isBefore(mb)) {
        return -1;
      } else if (ma.isAfter(mb)) {
        return 1;
      }
      // if dates are equivalent, sort by name
      const fa = a.originalFile.toLowerCase();
      const fb = b.originalFile.toLowerCase();
      if (fa < fb) {
        return -1;
      } else if (fa > fb) {
        return 1;
      }
      return 0;
    });
    this.stats = stats;
    this.total = this.stats.reduce((prev, curr) => prev + curr.count, 0)
  }

  private preventTotalChange = false;
  public computeTotalSelected(): void {
    let allUnselected = true;
    let allSelected = true;
    for (const stat of this.stats) {
      if (stat.selected === false) {
        allSelected = false;
      } else {
        allUnselected = false;
      }
    }
    this.preventTotalChange = true;
    if (!allSelected) {
      this.totalSelected = false;
    } else {
      this.totalSelected = true;
    }
    this.preventTotalChange = false;
    this.somethingSelected = !allUnselected;
  }

  public totalSelectedChanged(): void {
    if (this.preventTotalChange) {
      return;
    }
    for (const stat of this.stats) {
      stat.selected = this.totalSelected;
    }
    this.somethingSelected = this.totalSelected;
  }

  public async deleteSelectedObjects(): Promise<void> {
    if (this.totalSelected) {
      return this.deleteAllObjects();
    }
    const nbObjects = this.stats.filter(s => s.selected).reduce((prev, curr) => prev + curr.count, 0);
    const response = await ConfirmDialog.renderModal({title: 'Are you sure ?', text: `You are about to permanently remove ${nbObjects} objects from the server`});
    if (!response.wasDismissed) {
      for (const stat of this.stats.filter(s => s.selected)) {
        await this.siteManager.pruneObjectsFromFile(stat.originalFile, 'gis', ['IFCSITE']);
        await this.siteManager.pruneObjectsFromFile(stat.originalFile, 'bim', ['IFCSITE']);
      }
      const idsToDelete = this.siteManager.getObjectIdsRemoved();
      const uploadData: UploadData = {
        objectsToRemove: idsToDelete
      };
      await ThreeSiteModel.uploadData(this.siteManager.siteId, uploadData);
      this.siteManager.resetObjectIdsRemoved();
      this.siteManager.resetMarkAsUpdated();
      await this.sitesTool.downloadGIS(true);
      await this.fetchStats();
    }
  }

  public async deleteAllObjects(): Promise<void> {
    const response = await ConfirmDialog.renderModal({title: 'Are you sure ?', text: `You are about to permanently remove all objects from the server`});
    if (!response.wasDismissed) {
      await this.sitesTool.deleteSiteData();
    }
    this.siteManager.dispose();
    await this.sitesTool.downloadGIS(true);
    await this.fetchStats();
    this.totalSelected = false;
  }

  public exportSelectedObjects(): void {
    ConfirmDialog.renderModal({text: 'Sorry, this feature is under development'});
  }
}
