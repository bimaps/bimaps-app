import { BaseTool } from './base-tool';
import { EventAggregator } from 'aurelia-event-aggregator';
import { inject, bindable, bindingMode } from 'aurelia-framework';
import { Three } from '../three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { ThreeUtils } from '../three-utils';
import { IfcModel } from 'web-ifc-three/IFC/BaseDefinitions';
import { IFCLoader } from "web-ifc-three/IFCLoader";
import { IFCSPACE, IFCOPENINGELEMENT } from 'web-ifc';
import * as THREE from 'three';
import { Global } from '../../global';
import { Rights } from '../rights';
import { IfcjsDecompose } from '../../ifcjs-components/ifcjs-decompose';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { SiteManager } from './../site-manager';

@inject(EventAggregator, Three, Global, Rights)
export class SceneTool extends BaseTool {

  @bindable({defaultBindingMode: bindingMode.toView}) private siteManager: SiteManager;

  public objectLoader: THREE.ObjectLoader;
  public ifcLoader: IFCLoader;
  public gltfLoader: GLTFLoader;
  private importing = false;
  private importingFile: File;
  private processing = false;
  private activityId: string;
  private includePsets = false;
  private includeSiteObjects = false;
  private flatten = false;
  private hasSiteObjects = false;
  private context: 'gis' | 'bim' = 'gis';

  constructor(eventAggregator: EventAggregator, private three: Three, private global: Global, private rights: Rights) {
    super(eventAggregator);
  }

  public attached(): void {
    super.attached();
    this.objectLoader = new THREE.ObjectLoader();
    this.gltfLoader = new GLTFLoader();
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

  public clearScene(): void {
     ThreeUtils.clearScene(this.three.scene.scene);
  }

  private exporting = false;
  public async exportScene(): Promise<void> {
    if (this.exporting) {
      console.warn('Wait for exporting to complete');
      return;
    }
    this.exporting = true;
    try {

      const exporter = new GLTFExporter();

      exporter.parse(this.three.scene.scene, (gltf) => {
        const content = JSON.stringify(gltf);
        const blob = new Blob([content], {type: 'octet/stream'});
        const url = URL.createObjectURL(blob);
        // location.href = url;
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scene.gltf';
        a.click();
        URL.revokeObjectURL(url);
      }, {});

    } catch (error) {
      console.error(error);
    }
    this.exporting = false;
  }

  private async promptFile(accept: string): Promise<File> {
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('accept', `${accept}`);
    input.click();

    return new Promise((resolve, reject) => {
      input.addEventListener('change', () => {
        if (input.files && input.files.length === 1) {
          resolve(input.files[0])
        }
        reject(new Error('No valid file selected'));
      });
    });
  }

  public async importFile(): Promise<void> {
    if (this.importing || this.processing) {
      return;
    }
    try {
      const file = await this.promptFile('.ifc,.json,.geojson,.gltf');
      this.importingFile = file;
      if (file.name.substr(-4) === '.ifc') {
        await this.importIFC(file);
      } else if (file.name.substr(-5) === '.json' || file.name.substr(-8) === '.geojson') {
        await this.importJSON(file);
      } else if (file.name.substr(-5) === '.gltf') {
        await this.importGLTF(file);
      }
    } catch (error) {
      console.error(error);
    }
  }

  private ifcModels: IfcModel[] = [];
  private async importIFC(file: File): Promise<void> {
    if (this.importing || this.processing) {
      return;
    }
    try {
      this.activityId = `import-ifc-${Math.round(Math.random() * 1000)}`;
      this.importing = true;
      this.processing = true;
      const ifcURL = URL.createObjectURL(file);
      this.eventAggregator.publish('three:activity', {id: this.activityId, label: 'Preparing IFC Import', percentage: 0});
      const ifcModel = await this.ifcLoader.loadAsync(ifcURL);
      this.three.scene.scene.add(ifcModel.mesh);
      this.ifcModels.push(ifcModel);
      this.hasSiteObjects = await IfcjsDecompose.hasSiteObjects(this.ifcLoader.ifcManager, ifcModel.modelID);
      this.includeSiteObjects = false;
      this.flatten = false;
      this.includePsets = false;
    } catch (error) {
      console.error(error);
    }
    this.eventAggregator.publish('three:activity', {id: this.activityId, label: 'Importing IFC', percentage: 100});
    this.processing = false;
  }

  public async decompose(): Promise<void> {
    if (this.processing) {
      return;
    }
    this.processing = true;
    if (this.ifcModels.length) {
      for (const model of this.ifcModels) {
        this.decomposeModel(model);
      }
    }
    this.processing = false;
  }

  private async decomposeModel(model: IfcModel): Promise<void>{
    const activityId = `decompose-ifc-${Math.round(Math.random() * 1000)}`;
    this.eventAggregator.publish('three:activity', {id: activityId, label: `Decomposing model [${model.modelID}]`, percentage: 0});
    model.mesh.removeFromParent();
    const ifcDecompose = new IfcjsDecompose();
    const newObject = await ifcDecompose.parseModelID(this.ifcLoader.ifcManager, model.modelID, (event) => {
      const percentage = Math.floor((event.loaded * 100) / event.total);
      this.eventAggregator.publish('three:activity', {id: activityId, label: `Decomposing model [${model.modelID}]`, percentage});
    }, this.includePsets, this.includeSiteObjects);
    this.three.scene.scene.add(newObject);
    const index = this.ifcModels.indexOf(model);
    if (index !== -1) {
      this.ifcModels.splice(index, 1);
    }
    this.eventAggregator.publish('three:activity', {id: activityId, label: `Decomposing model [${model.modelID}]`, percentage: 100});

    this.siteManager.loadFromIFCExtract(newObject, 'ignore', this.context, this.flatten);
  }

  private async importJSON(file: File): Promise<void> {
    if (this.importing || this.processing) {
      return;
    }
    try {
      this.importing = true;
      this.processing = true;
      this.activityId = `import-json-${Math.round(Math.random() * 1000)}`;
      const fileURL = URL.createObjectURL(file);
      const result = await this.objectLoader.loadAsync(fileURL, (event) => {
        const percentage = Math.floor((event.loaded * 100) / event.total);
        this.eventAggregator.publish('three:activity', {id: this.activityId, label: 'Importing JSON', percentage});
      });
      ThreeUtils.addInScene(result, this.three.scene.scene);
    } catch (error) {
      console.error(error);
    }
    this.processing = false;
    this.eventAggregator.publish('three:activity', {id: this.activityId, label: 'Importing JSON', percentage: 100});
  }

  private async importGLTF(file: File): Promise<void> {
    if (this.importing || this.processing) {
      return;
    }
    try {
      this.importing = true;
      this.processing = false;

      const dracoLoader = new DRACOLoader();
      // dracoLoader.setDecoderPath( '/examples/js/libs/draco' );
      dracoLoader.setDecoderPath( 'draco/' );
      // dracoLoader.preload();
      this.gltfLoader.setDRACOLoader( dracoLoader );
 
      this.activityId = `import-gltf-${Math.round(Math.random() * 1000)}`;
      const fileURL = URL.createObjectURL(file);
      const result = await this.gltfLoader.loadAsync(fileURL, (event) => {
        const percentage = Math.floor((event.loaded * 100) / event.total);
        this.eventAggregator.publish('three:activity', {id: this.activityId, label: 'Importing JSON', percentage});
      });
      this.three.scene.scene.add(result.scene);
    } catch (error) {
      console.error(error);
    }
    this.processing = false;
    this.eventAggregator.publish('three:activity', {id: this.activityId, label: 'Importing JSON', percentage: 100});
  }

}
