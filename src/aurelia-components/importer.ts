import { ThreeSiteModel } from './../models/site.model';
import { IFCJSHelper } from './../ifcjs-components/ifcjs-helper';
import { SiteManager } from './site-manager';
import { IfcjsDecompose } from './../ifcjs-components/ifcjs-decompose';
import { inject } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';
import { IfcModel } from 'web-ifc-three/IFC/BaseDefinitions';
import { IFCLoader } from "web-ifc-three/IFCLoader";
import { IFCSPACE, IFCOPENINGELEMENT } from 'web-ifc';
import { Group, Mesh, Object3D, Vector3 } from 'three';
import { OptimizeGeometries } from './../three-utils/optimize-geometries';
import * as moment from 'moment';

interface ImportSettings {
  settings?: {
    context: 'gis' | 'bim';
    includePsets: boolean;
    includeSiteObjects: boolean;
    ignoreBuildings: boolean;
    flatten: boolean;
    translate: boolean;
    translation: {
      x: string,
      y: string,
      z: string,
    };
    rotate: boolean;
    rotation: {
      x: string,
      y: string,
      z: string,
    };
  };
  ui?: {
    showDetail: boolean;
    importing?: boolean;
    imported?: boolean;
  };
}

export type FileToImport = File & ImportSettings;
export type BufferToImport = ArrayBuffer & ImportSettings & {name?: string};
export type DataToImport = FileToImport | BufferToImport;
@inject(EventAggregator)
export class ImporterService {

  private ifcLoader: IFCLoader;
  private activityId: string;
  private importId: string;
  public filesToImport: DataToImport[];
  public siteManager: SiteManager;
  public site: ThreeSiteModel;

  public constructor(private eventAggregator: EventAggregator) {
    this.ifcLoader = new IFCLoader();
    this.ifcLoader.ifcManager.setWasmPath('files/');
    this.ifcLoader.ifcManager.applyWebIfcConfig({
      COORDINATE_TO_ORIGIN: false,
      USE_FAST_BOOLS: false
    });
    this.ifcLoader.ifcManager.useWebWorkers(true, 'files/IFCWorker.js');

    this.ifcLoader.ifcManager.setOnProgress((event) => {
      const percentage = Math.floor((event.loaded * 100) / event.total);
      this.eventAggregator.publish('three:activity', {id: this.activityId, label: 'Importing IFC', percentage});
    });

    this.ifcLoader.ifcManager.parser.setupOptionalCategories({
      [IFCSPACE]: true,
      [IFCOPENINGELEMENT]: false
    });
  }

  private setRandomImportId() {
    this.importId = `Import-${new Date().getFullYear()}-${new Date().getMonth()}-${new Date().getDate()}-${Math.round(Math.random() * 1000)}`;
  }

  public static guessImportFileSettings = (file: DataToImport): void => {
    // overwrite if necessary
  }

  public static sortImportFilesBeforeImport = (files: DataToImport[]): void => {
    // overwrite if necessary
    // by default place gis files before bim files
    files.sort((a, b) => {
      if (a.settings.context === 'gis' && b.settings.context === 'bim') {
        return -1;
      } else if (a.settings.context === 'bim' && b.settings.context === 'gis') {
        return 1;
      }
      return 0;
    });
  }

  public async importFiles(): Promise<void> {
    try {
      this.setRandomImportId();
      ImporterService.sortImportFilesBeforeImport(this.filesToImport);
      const date = moment().format('DD/MM/YYYY HH:mm:ss');
      for (const file of this.filesToImport) {
        file.ui.importing = true;
        const ifcModel = await this.importIFC(file);
        const decomposedObject = await this.decomposeModel(ifcModel, file);
        const buildings = IFCJSHelper.getBuildingsObjects(decomposedObject);
        for (const building of buildings) {
          if (!building.userData.properties?.name) {
            console.warn(`Building is missing a name in file '${file.name}'`, building.userData);
            console.warn('- Adding the name `Building` automatically');
            if (!building.userData.properties) {
              building.userData.properties = {};
            }
            building.userData.properties.name = 'Building';
          }
        }
        const objectsToIgnore: Object3D[] = [];
        decomposedObject.traverse(o => {
          if (file.settings.ignoreBuildings && o.userData.properties?.type === 'IFCBUILDING') {
            objectsToIgnore.push(o);
          }
          o.userData.import = {
            id: this.importId,
            originalFile: file.name,
            date: date
          }
        });
        for (const objectToIgnore of objectsToIgnore) {
          objectToIgnore.removeFromParent();
        }
        if (file.settings.translate) {
          const translation = new Vector3(
            parseFloat(file.settings.translation.x),
            parseFloat(file.settings.translation.y),
            parseFloat(file.settings.translation.z)
          );

          if (file.settings.includeSiteObjects) {
            const site = IFCJSHelper.getSiteObject(decomposedObject);
            site.position.add(translation);
          } else {
            for (const building of buildings) {
              building.position.add(translation);
            }
          }
        }
        if (file.settings.rotate) {
          const rotation = new Vector3(
            parseFloat(file.settings.rotation.x),
            parseFloat(file.settings.rotation.y),
            parseFloat(file.settings.rotation.z)
          );

          if (file.settings.includeSiteObjects) {
            const site = IFCJSHelper.getSiteObject(decomposedObject);
            site.rotation.set(rotation.x, rotation.y, rotation.z);
          } else {
            for (const building of buildings) {
              building.rotation.set(rotation.x, rotation.y, rotation.z);
            }
          }
        }
        await this.siteManager.pruneObjectsFromFile(file.name, file.settings.context, 'auto');
        // wait 800ms so that we "see" that the objects are changing
        await new Promise(resolve => setTimeout(resolve, 800));
        // const replaceIfFound = file.settings.context === 'gis' ? 'except-site' : false;
        await this.siteManager.loadFromIFCExtract(decomposedObject, 'ignore', file.settings.context, file.settings.flatten);
        file.ui.imported = true;
        file.ui.importing = false;
      }
    } catch (error) {
      console.error(error);
    }
  }

  private async importIFC(data: DataToImport): Promise<IfcModel> {
    try {
      this.activityId = `import-ifc-${Math.round(Math.random() * 1000)}`;
      this.eventAggregator.publish('three:activity', {id: this.activityId, label: 'Preparing IFC Import', percentage: 0});
      if (data instanceof File) {
        const ifcURL = URL.createObjectURL(data);
        const ifcModel = await this.ifcLoader.loadAsync(ifcURL);
        this.eventAggregator.publish('three:activity', {id: this.activityId, label: 'Importing IFC', percentage: 100});
        return ifcModel;
      } else if (data instanceof ArrayBuffer) {
        console.log('parsing buffer', data);
        const ifcModel = await this.ifcLoader.parse(data) as any;
        console.log('result of parsing', ifcModel);
        this.eventAggregator.publish('three:activity', {id: this.activityId, label: 'Importing IFC', percentage: 100});
        return ifcModel;
      } else {
        throw new Error('Invalid data to import');
      }
    } catch (error) {
      this.eventAggregator.publish('three:activity', {id: this.activityId, label: 'Importing IFC', percentage: 100});
      console.error(error);
    }
  }


  private async decomposeModel(model: IfcModel, file: DataToImport): Promise<Group | Mesh>{
    const activityId = `decompose-ifc-${Math.round(Math.random() * 1000)}`;
    this.eventAggregator.publish('three:activity', {id: activityId, label: `Decomposing model [${model.modelID}]`, percentage: 0});
    // model.mesh.removeFromParent();
    const ifcDecompose = new IfcjsDecompose();
    const newObject = await ifcDecompose.parseModelID(this.ifcLoader.ifcManager, model.modelID, (event) => {
      const percentage = Math.floor((event.loaded * 100) / event.total);
      this.eventAggregator.publish('three:activity', {id: activityId, label: `Decomposing model [${model.modelID}]`, percentage});
    }, file.settings.includePsets, file.settings.includeSiteObjects);
    this.eventAggregator.publish('three:activity', {id: activityId, label: `Decomposing model [${model.modelID}]`, percentage: 100});
    return newObject;
  }

  public async upload(): Promise<void> {
    await this.optimizeGeometries();

    const activityId = `uploading-site-${Math.round(Math.random() * 1000)}`;
    this.eventAggregator.publish('three:activity', {id: activityId, label: `Uploading Site Data ${this.site.name}`})
    try {
      const idsToDelete = this.siteManager.getObjectIdsRemoved();
      this.setRandomImportId();
      const uploadData = await ThreeSiteModel.prepareForUpload(this.site.id, [this.siteManager.siteObject], {ignoreExisting: true});
      uploadData.objectsToRemove = idsToDelete;
      
      // TODO: determine if the upload must be splitted
      const isTooBigForOneUpload = true;
      if (isTooBigForOneUpload) {
        // The upload is splitted in two so that when a scene is big it can be handled
        const {geometries, ...otherData} = uploadData;
        await ThreeSiteModel.uploadData(this.site.id, otherData);
        await ThreeSiteModel.uploadData(this.site.id, {geometries});
      } else {
        await ThreeSiteModel.uploadData(this.site.id, uploadData);
      }
      this.siteManager.resetObjectIdsRemoved();
      this.siteManager.resetMarkAsUpdated();
      this.eventAggregator.publish('aurelia-three:uploaded-objects', uploadData);
    } catch (error) {
      // log error
      console.error(error);
    }
    this.eventAggregator.publish('three:activity', {id: activityId, label: `Uploading Site Data ${this.site.name}`, percentage: 100});
    this.setRandomImportId();
  }

  private optimizingGeometries = false;
  public async optimizeGeometries(): Promise<void> {
    if (this.optimizingGeometries) {
      return;
    }
    
    const activityId = `optimizing-geometries-${Math.round(Math.random() * 1000)}`;
    this.eventAggregator.publish('three:activity', {id: activityId, label: 'Optimizing Geometries', percentage: 0});
    await new Promise(resolve => setTimeout(resolve, 10)); // this allow for the activity to be displayed
    try {
      const optimizer = new OptimizeGeometries(this.siteManager.scene);
      await optimizer.findIdenticalGeometries();
    } catch (error) {
      console.error(error);
    }
    this.eventAggregator.publish('three:activity', {id: activityId, label: 'Optimizing Geometries', percentage: 100});
    this.optimizingGeometries = false;
  }

}
