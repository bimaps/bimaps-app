import { ThreeSiteModel } from './../../../models/site.model';
import { AdjustTranslationRotationDialog } from './../dialogs/adjust-translation-rotation';
import { SitesTool } from './../sites-tool';
import { IFCJSHelper } from './../../../ifcjs-components/ifcjs-helper';
import { SiteManager } from './../../site-manager';
import { IfcjsDecompose } from './../../../ifcjs-components/ifcjs-decompose';
import { inject, bindable } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { IfcModel } from 'web-ifc-three/IFC/BaseDefinitions';
import { IFCLoader } from "web-ifc-three/IFCLoader";
import { IFCSPACE, IFCOPENINGELEMENT } from 'web-ifc';
import { Group, Mesh, Object3D, Vector3 } from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { Three } from '../../three';
import { OptimizeGeometries } from './../../../three-utils/optimize-geometries';
import * as moment from 'moment';
import { FileToImport, ImporterService } from '../../importer';


@inject(EventAggregator, Three, SitesTool, ImporterService)
export class ImportFromFiles {

  @bindable siteManager: SiteManager;

  private activityId: string;
  private filesToImport: FileToImport[] = [];
  private subs: Subscription[] = [];
  private processing = false;
  private importId: string = '';

  private status: 'select-files' | 'files-imported' = 'select-files';
  private importedBuildings: Object3D[] = [];

  private transformControls: TransformControls;

  public constructor(private eventAggregator: EventAggregator, private three: Three, private sitesTool: SitesTool, private importerService: ImporterService) {}

  public detached(): void {
    this.disposeTransformTool();
  }

  private async promptFiles(accept: string): Promise<FileList> {
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('accept', `${accept}`);
    input.toggleAttribute('multiple', true);
    input.click();

    return new Promise((resolve, reject) => {
      input.addEventListener('change', () => {
        resolve(input.files)
      });
    });
  }

  public async selectFilesToImport(): Promise<void> {
    const fileList = await this.promptFiles('.ifc');
    if (fileList.length === 0) {
      return;
    }
    for (let index = 0; index < fileList.length; index++) {
      const file: FileToImport = fileList.item(index);
      file.settings = {
        context: 'gis',
        includePsets: false,
        includeSiteObjects: true,
        ignoreBuildings: false,
        flatten: false,
        rotate: false,
        translate: false,
        translation: {x: '0', y: '0', z: '0'},
        rotation: {x: '0', y: '0', z: '0'},
      };
      file.ui = {
        showDetail: false,
        imported: false,
        importing: false
      }
      ImporterService.guessImportFileSettings(file);
      this.filesToImport.push(file);
    }

    ImporterService.sortImportFilesBeforeImport(this.filesToImport);
  }

  

  public removeFromImportList(file: FileToImport): void {
    const index = this.filesToImport.indexOf(file);
    if (index !== -1) {
      this.filesToImport.splice(index, 1);
    }
    ImporterService.sortImportFilesBeforeImport(this.filesToImport);
  }


  public switchFileContext(file: FileToImport): void {
    file.settings.context = file.settings.context === 'gis' ? 'bim' : 'gis';
  }

  public async editFileTranslation(file: FileToImport): Promise<void> {
    const initialValue = {...file.settings.translation};
    const response = await AdjustTranslationRotationDialog.renderModal({mode: 'translation', initialValue});
    if (!response.wasDismissed) {
      file.settings.translation = initialValue;
    }
  }

  public async editFileRotation(file: FileToImport): Promise<void> {
    const initialValue = {...file.settings.rotation};
    const response = await AdjustTranslationRotationDialog.renderModal({mode: 'rotation', initialValue});
    if (!response.wasDismissed) {
      file.settings.rotation = initialValue;
    }
  }

  public async importFiles(): Promise<void> {
    try {
      const site = await ThreeSiteModel.getOneWithId(this.siteManager.siteId);
      if (!site) {
        throw new Error('Site not found');
      }
      this.importerService.site = site;
      this.importerService.siteManager = this.siteManager;
      this.importerService.filesToImport = this.filesToImport;
      await this.importerService.importFiles();
      this.three.navigationControls.zoomOnObject(this.siteManager.siteObject);
      this.importedBuildings = IFCJSHelper.getBuildingsObjects(this.siteManager.siteObject).filter(b => !b.userData.id);
      this.status = 'files-imported';
    } catch (error) {
      console.error(error);
    }
  }

  public async upload(): Promise<void> {
    this.sitesTool.discardBuildingTranslationAndRotation();
    this.disposeTransformTool();
    await this.importerService.upload();
    this.startNewImport();
  }

  public adjusting: string | undefined = undefined;
  public adjustBuildingPosRot(building: Object3D, mode: 'translate' | 'rotate', event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.transformControls = new TransformControls(this.three.scene.camera, this.three.scene.renderer.domElement);
    if (mode === 'translate') {
      this.transformControls.setMode('translate');
      this.transformControls.showX = true;
      this.transformControls.showY = true;
      this.transformControls.showZ = true;
    } else if (mode === 'rotate') {
      this.transformControls.setMode('rotate');
      this.transformControls.showX = false;
      this.transformControls.showY = true;
      this.transformControls.showZ = false;
    }
    this.transformControls.attach(building);
    this.transformControls.setSpace('local');
    this.three.scene.scene.add(this.transformControls);
    this.transformControls.addEventListener('change', () => {      
      // console.log('handle new position', building.position);
    });
    this.transformControls.addEventListener('dragging-changed', (event: {type: 'dragging-changed', value: boolean, target: TransformControls}) => {
      this.three.scene.controls.enabled = !event.value;
    });
    this.adjusting = building.userData.properties?.name || '';
  }

  public stopAdjusting(building: Object3D, event?: Event): void {
    console.info('BUILDING', building);
    console.info('BUILDING POSITION', building.position);
    console.info('BUILDING ROTATION', building.rotation);
    building.updateMatrix();
    building.updateMatrixWorld();
    this.disposeTransformTool();
    this.adjusting = undefined;
  }

  public disposeTransformTool(): void {
    if (this.transformControls) {
      this.transformControls.detach();
      this.transformControls.dispose();
      this.three.scene.scene.remove(this.transformControls);
      this.transformControls = undefined;
    }
  }

  public async startNewImport(): Promise<void> {
    this.filesToImport = [];
    this.status = 'select-files';
    // empty siteManager and restart with GIS
    await this.sitesTool.downloadGIS(true);
    this.disposeTransformTool();
  }
}
