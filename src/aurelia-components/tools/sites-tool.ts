import { AdjustTranslationRotationDialog } from './dialogs/adjust-translation-rotation';
import { PromptTextDialog } from './../../components/dialogs/prompt-text';
import { ConfirmDialog } from 'components/dialogs/confirm';
import { ThreeThemeModel } from './../../models/theme.model';
import { IFCJSHelper } from './../../ifcjs-components/ifcjs-helper';
import { BaseTool } from './base-tool';
import { EventAggregator } from 'aurelia-event-aggregator';
import { inject, bindable, bindingMode } from 'aurelia-framework';
import { Three } from '../three';
import { ThreeSiteModel } from '../../internal';
import { Object3D, Vector3 } from 'three';
import { SiteManager } from '../site-manager';
import { SelectDialog } from './../../components/dialogs/select';
import { Rights } from '../rights';

@inject(EventAggregator, Three, Rights)
export class SitesTool extends BaseTool {

  @bindable({defaultBindingMode: bindingMode.fromView}) private siteId: string;
  @bindable({defaultBindingMode: bindingMode.fromView}) private siteManager: SiteManager;
  private sites: ThreeSiteModel[] = [];
  public selectedSite: ThreeSiteModel;

  private mode: 'list-sites' | 'edit-site' = 'list-sites';

  constructor(eventAggregator: EventAggregator, private three: Three, private rights: Rights) {
    super(eventAggregator);
    this.hoverBoxPosition = 'next-toolbar';
  }

  public attached(): void {
    super.attached();
    this.fetchSites();
  }

  public detached(): void {
    super.detached();
  }

  private async fetchSites(): Promise<void> {
    this.sites = await ThreeSiteModel.getAll();
    this.eventAggregator.publish('aurelia-three:sites:fetched');
  }

  private async askToSaveSiteChanges(): Promise<void> {
    if (this.siteHasChanged) {
      const response = await ConfirmDialog.renderModal({
        title: 'Save Modification ?',
        text: `You have unsaved modification in the "${this.selectedSite.name}" site. Would you like to save now. If not, your current modifications will be lost.`,
        cancelButtonText: 'No',
        okButtonText: 'Yes'
      });
      if (!response.wasDismissed && response.value) {
        await this.saveSiteSettings();
      } else {
        await this.fetchSites();
        this.siteHasChanged = false;
      }
    }
  }

  public async selectSite(siteId: string, autoDownloadGIS = true) {
    if (this.selectedSite?.id === siteId) {
      return;
    }
    if (this.selectedSite) {
      await this.unselectSite();
    }
    await this.askToSaveSiteChanges();
    this.three.stylingService.removeAllOverlays();
    const site = this.sites.find(s => s.id === siteId);
    if (site) {
      this.siteId = site.id;
      this.selectedSite = site;
      localStorage.setItem('current-site-id', this.siteId);

      if (this.selectedSite.settings.defaultThemeId) {
        this.eventAggregator.publish('aurelia-three:themes:select', this.selectedSite.settings.defaultThemeId);
      } else {
        this.eventAggregator.publish('aurelia-three:themes:deactivate-current');
      }
      if (this.siteManager) {
        this.siteManager.dispose();
      }
      this.siteManager = new SiteManager(this.three.scene.scene, this.three.stylingManager, this.three.navigationControls);
      (window as any).siteManager = this.siteManager;
      this.siteManager.siteId = this.siteId;
      if (autoDownloadGIS) {
        this.downloadGIS(true);
      }
    }
  }

  public async editSite(siteId: string, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    await this.unselectSite();
    await this.selectSite(siteId, true);
    this.fetchPublicThemes();
    this.mode = 'edit-site';
  }

  public backToList(): void {
    this.mode = 'list-sites';
  }

  public async unselectSite(): Promise<void> {
    await this.askToSaveSiteChanges();
    this.eventAggregator.publish('aurelia-three:select-tool:select', {});
    if (this.selectedSite) {
      this.selectedSite = undefined;
    }
    if (this.siteId) {
      this.siteId = undefined;
    }
  }

  public getSelectedSite() {
    return this.selectedSite;
  }

  public async downloadGIS(disposeFirst = false): Promise<void> {
    const activityId = `downloading-site-${Math.round(Math.random() * 1000)}`;
    const site = this.selectedSite;
    this.eventAggregator.publish('three:activity', {id: activityId, label: `Loading Site Structure: ${site.name}`})
    try {
      if (disposeFirst) {
        this.siteManager.dispose();
      }
      await this.siteManager.loadGIS({force: false});
      this.applyBuildingTranslationAndRotation();
      this.three.navigationControls.zoomOnObject(this.siteManager.siteObject);
    } catch (error) {
      // log error
      console.error(error);
    }

    this.eventAggregator.publish('three:activity', {id: activityId, label: `Loading Site Objects: ${site.name}`, percentage: 100})
    this.three.stylingManager.apply(this.three.scene.scene);
  }

  public applyBuildingTranslationAndRotation(): void {
    if (this.siteManager.siteObject) {
      const buildings = IFCJSHelper.getBuildingsObjects(this.siteManager.siteObject) || [];
      for (const building of buildings) {
        const b = building as Object3D & {_translatedWith: Vector3};
        if (b._translatedWith) {
          continue;
        }
        const buildingName = building.userData.properties?.name;
        const shouldTranslate = this.selectedSite.settings[buildingName]?.translate;
        if (shouldTranslate) {
          const translation = this.selectedSite.settings[buildingName]?.translation;
          if (!translation) {
            continue;
          }
          const vector = new Vector3(
            parseFloat(translation.x), 
            parseFloat(translation.y),
            parseFloat(translation.z)
          );
          building.position.add(vector);
          b._translatedWith = vector;
        }
      }
    }
  }

  public discardBuildingTranslationAndRotation(): void {
    if (this.siteManager.siteObject) {
      const buildings = IFCJSHelper.getBuildingsObjects(this.siteManager.siteObject) || [];
      for (const building of buildings) {
        const b = building as Object3D & {_translatedWith: Vector3};
        if (!b._translatedWith) {
          continue;
        }
        building.position.sub(b._translatedWith);
        b._translatedWith = undefined;
      }
    }
  }

  public async downloadAllObjects(): Promise<void> {
    const activityId = `downloading-site-${Math.round(Math.random() * 1000)}`;
    const site = this.selectedSite;
    this.eventAggregator.publish('three:activity', {id: activityId, label: `Loading Site Structure: ${site.name}`})
    try {
      await this.siteManager.loadGIS({force: false});
      this.three.navigationControls.zoomOnObject(this.siteManager.siteObject);
      const buildings = this.buildings(this.siteManager.siteObject);
      for (const building of buildings) {
        const buildingName = building.userData.properties?.name || 'Building';
        const storeys = this.storeys(building);
        for (const storey of storeys) {
          const storeyName = storey.userData.properties?.name;
          this.eventAggregator.publish('three:activity', {id: activityId, label: `Loading Objects: ${buildingName} / ${storeyName}`})
          this.siteManager.loadBIM(storey.userData.building, storey.userData.storey, false);
        }
      }
    } catch (error) {
      // log error
      console.error(error);
    }

    this.eventAggregator.publish('three:activity', {id: activityId, label: `Loading Site Objects: ${site.name}`, percentage: 100})
    this.three.stylingManager.apply(this.three.scene.scene);
  }

  public async clearCache(): Promise<void> {
    const site = this.selectedSite;
    await ThreeSiteModel.api.delete(`/three/site/${site.id}/clear-cache`);
  }

  public async deleteSiteData(): Promise<void> {
    const activityId = `clearing-site-${Math.round(Math.random() * 1000)}`;
    const site = this.selectedSite;
    this.eventAggregator.publish('three:activity', {id: activityId, label: `Clearing Site Data ${site.name}`})
    await ThreeSiteModel.clearData(site.id);
    this.eventAggregator.publish('three:activity', {id: activityId, label: `Clearing Site Data ${site.name}`, percentage: 100})
    this.downloadGIS(true);
  }

  public buildings(siteObject: Object3D): Object3D[] {
    if (!siteObject) {
      return [];
    }
    const buildings = IFCJSHelper.getBuildingsObjects(siteObject)?.filter(b => b.children.length > 0) || [];
    this.selectedSite.settings = this.selectedSite.settings || {};
    for (const building of buildings) {
      this.selectedSite.settings[building.userData.properties.name] = this.selectedSite.settings[building.userData.properties.name] || {};
    }
    return buildings;
  }
  
  public storeys(buildingObject: Object3D): Object3D[] {
    if (!buildingObject) {
      return [];
    }
    return IFCJSHelper.getStoreysObjects(buildingObject) || [];
  }

  private siteHasChanged = false;
  public publicThemes: ThreeThemeModel[] = [];
  public async fetchPublicThemes(): Promise<void> {
    this.publicThemes = await ThreeThemeModel.getAll('?isPublic=1');
  }
  public themeName(themeId: string): string {
    const theme = this.publicThemes.find(t => t.id === themeId);
    return theme ? theme.name : '';
  }
  public async editDefaultPublicTheme(): Promise<void> {
    if (!this.selectedSite.settings) {
      this.selectedSite.settings = {};
    }
    const currentDefaultPublicTheme = this.selectedSite.settings.defaultThemeId;
    const options = this.publicThemes.map(t => {
      return {value: t.id, label: t.name};
    });
    const response = await SelectDialog.renderModal({title: 'Select a Theme', options, initialValue: currentDefaultPublicTheme});
    if (response.wasDismissed) {
      return;
    }
    const newDefaultPublicTheme = response.value;
    if (newDefaultPublicTheme === currentDefaultPublicTheme) {
      return;
    }
    this.selectedSite.settings.defaultThemeId = newDefaultPublicTheme;
    this.siteHasChanged = true;
  }

  public backgroundColor: string = '0xffffff';

  public async editbackgroundColor(): Promise<void> {
    if (!this.selectedSite.settings) {
      this.selectedSite.settings = {};
    }
    const currentBackgroundColor = this.selectedSite.settings.backgroundColor;
    if (currentBackgroundColor === this.backgroundColor){
      return;
    }
    this.selectedSite.settings.backgroundColor = this.backgroundColor;
    // settings.three.sceneBackground = this.backgroundColor;
    this.siteHasChanged = true;
  }
  public async editDefaultStoreyForBuilding(building: Object3D): Promise<void> {
    if (building.userData.properties.type !== 'IFCBUILDING') {
      return;
    }
    if (!this.selectedSite.settings) {
      this.selectedSite.settings = {};
    }
    const buildingName = building.userData.properties?.name;
    if (!this.selectedSite.settings[buildingName]) {
      this.selectedSite.settings[buildingName] = {};
    }
    const currentDefaultStorey = this.selectedSite.settings[buildingName].defaultStorey;
    const options = this.storeys(building).map(s => {
      return {value: s.userData.properties?.name, label: s.userData.properties?.name || s.uuid}
    });
    const response = await SelectDialog.renderModal({title: 'Select a Theme', options, initialValue: currentDefaultStorey});
    if (response.wasDismissed) {
      return;
    }
    const newDefaultStorey = response.value;
    if (newDefaultStorey === currentDefaultStorey) {
      return;
    }
    this.selectedSite.settings[buildingName].defaultStorey = newDefaultStorey;
    this.siteHasChanged = true;
  }
  private initBuildingTranslationAndRotationSettings(building: Object3D): string {
    if (!this.selectedSite.settings) {
      this.selectedSite.settings = {};
    }
    const buildingName = building.userData.properties?.name;
    if (!this.selectedSite.settings[buildingName]) {
      this.selectedSite.settings[buildingName] = {};
    }
    this.selectedSite.settings[buildingName].translate = this.selectedSite.settings[buildingName].translate === true;
    this.selectedSite.settings[buildingName].rotate = this.selectedSite.settings[buildingName].rotate === true;
    this.selectedSite.settings[buildingName].translation = this.selectedSite.settings[buildingName].translation || {x: '0', y: '0', z: '0'};
    this.selectedSite.settings[buildingName].rotation = this.selectedSite.settings[buildingName].rotation || {x: '0', y: '0', z: '0'};
    return buildingName;
  }
  public async editBuildingTranslation(building: Object3D): Promise<void> {
    if (building.userData.properties.type !== 'IFCBUILDING') {
      return;
    }
    const buildingName = this.initBuildingTranslationAndRotationSettings(building);
    const initialValue = this.selectedSite.settings[buildingName].translation;
    const response = await AdjustTranslationRotationDialog.renderModal({mode: 'translation', initialValue});
    if (!response.wasDismissed) {
      this.selectedSite.settings[buildingName].translation = initialValue;
      this.siteHasChanged = true;
    }
  }

  public async editBuildingRotation(building: Object3D): Promise<void> {
    if (building.userData.properties.type !== 'IFCBUILDING') {
      return;
    }
    const buildingName = this.initBuildingTranslationAndRotationSettings(building);
    const initialValue = this.selectedSite.settings[buildingName].rotation;
    const response = await AdjustTranslationRotationDialog.renderModal({mode: 'rotation', initialValue});
    if (!response.wasDismissed) {
      this.selectedSite.settings[buildingName].rotation = initialValue;
      this.siteHasChanged = true;
    }
  }
  public async saveSiteSettings(): Promise<void> {
    try {
      await this.selectedSite.updateProperties('', ['settings']);
      this.siteHasChanged = false;
    } catch (error) {
      console.error(error);
    }
  }

  public async createNewSite(): Promise<void> {
    const response = await PromptTextDialog.renderModal({title: 'Name of the new site', initialValue: 'Enter a new site name'});
    if (response.wasDismissed || !response.value) {
      return;
    }
    const newSite = new ThreeSiteModel();
    newSite.name = response.value;
    const createdSite = await newSite.save();
    await this.fetchSites();
    await this.selectSite(createdSite.id);
  }

  public async deleteSite(): Promise<void> {
    const response = await ConfirmDialog.renderModal({title: 'Are you sure ?', text: `You are about to completely and permanentely remove the "${this.selectedSite.name}" site and all its data.`});
    if (response.wasDismissed) {
      return;
    }
    await this.deleteSiteData();
    await this.selectedSite.remove('');
    this.unselectSite();
    this.backToList();
    this.fetchSites();
  }

  
  public async editSiteName() {
    if (this.selectedSite?.name) {
      const SiteName = this.selectedSite.name.toString();
      const response = await PromptTextDialog.renderModal({title: 'Name of the site', initialValue: SiteName});
      if (response.wasDismissed || !response.value) {
        return;
      }
      this.selectedSite.name = response.value;
      const updateSite = await  this.selectedSite.updateProperties('', ['name']);
      await this.fetchSites();
      await this.selectSite(updateSite.id);
    }
  }

}
