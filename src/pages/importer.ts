import { ThreeSiteModel } from './../models/site.model';
import { SiteManager } from './../aurelia-components/site-manager';
import { inject } from 'aurelia-framework';
import { ImporterService, DataToImport, FileToImport, BufferToImport } from '../aurelia-components/importer';
import { Scene } from 'three';
import { Global } from '../global';
import { SdLogin } from 'aurelia-deco';
import '../custom/configurator';

// http://localhost:8082/importer?siteId=602f9d9bb75c6e0007956650&context=bim&includeSiteObjects=1&includePsets=1&flatten=1&ignoreBuildings=1&translate=1&tx=10&ty=20&tz=30&rotate=1&rx=5&ry=15&rz=25&url=http://localhost:8082/GIS_ensemble.ifc&token=ea6531f5771d5676fa7dfb2f4cad7c52&auto_upload=1

@inject(ImporterService, Global, SdLogin)
export class Importer {

  public inputFileElement: HTMLInputElement;
  private selectedFiles: DataToImport[] | undefined = undefined;
  public siteId: string = '';
  public url = '';
  public importId: string;
  
  private connected: boolean = false;
  private username: string = undefined;
  private password: string = undefined;
  
  public context: 'gis' | 'bim' = 'gis';
  public includePsets = false;
  public includeSiteObjects = false;
  public ignoreBuildings = false;
  public flatten = false;
  public translate = false;
  public translation = {x: '0', y: '0', z: '0'};
  public rotate = false;
  public rotation = {x: '0', y: '0', z: '0'};

  public error = '';
  public message = '';

  public constructor(private importerService: ImporterService, private global: Global, private sdLogin: SdLogin) {

  }

  public async activate(params: any) {
    if (params.siteId) {
      this.siteId = params.siteId;
    }
    if (params.url) {
      this.url = params.url;
    }
    if (params.context) {
      this.context = params.context;
    }
    if (params.includeSiteObjects) {
      this.includeSiteObjects = true;
    }
    if (params.includePsets) {
      this.includePsets = true;
    }
    if (params.ignoreBuildings) {
      this.ignoreBuildings = true;
    }
    if (params.flatten) {
      this.flatten = true;
    }
    if (params.translate) {
      this.translate = true;
    }
    if (params.tx) {
      this.translation.x = params.tx;
    }
    if (params.ty) {
      this.translation.y = params.ty;
    }
    if (params.ty) {
      this.translation.z = params.tz;
    }
    if (params.rotate) {
      this.rotate = true;
    }
    if (params.rx) {
      this.rotation.x = params.rx;
    }
    if (params.ry) {
      this.rotation.y = params.ry;
    }
    if (params.ry) {
      this.rotation.z = params.ry;
    }
    if (params.token) {
      await this.global.store.dispatch('setAccessToken', params.token)
    }
    if (params.auto_upload === '1') {
      this.importFile();
    }

    console.log('importer-page-is-loaded');
  }


  public async loginWithPassword(): Promise<void> {
    try {
      const username: string = (<HTMLInputElement>document.getElementById('username')).value;
      const password: string = (<HTMLInputElement>document.getElementById('password')).value;
      this.username = username;
      this.error = ''
      await this.sdLogin.login(username, password);
      this.afterLogin();
    } catch  (error) {
      console.log('error-login',error);
      this.error = error;
    }
  }

  public afterLogin(): void {
    setTimeout(() => {
      this.connected = true;
    }, 150);
  }

  public async importFile(): Promise<void> {
    this.error = '';
    this.message = '';
    try {
      
      this.selectedFiles = [];

      if (this.url) {
        const response = await fetch(this.url);
        const fileBuffer = await response.arrayBuffer();
        // const bufferToImport: BufferToImport = {name: this.url, ...fileBuffer};
        const bufferToImport: BufferToImport = fileBuffer;
        bufferToImport.name = this.url;
        bufferToImport.settings = {
          context: 'gis',
          includePsets: this.includePsets,
          includeSiteObjects: this.includeSiteObjects,
          ignoreBuildings: this.ignoreBuildings,
          flatten: this.flatten,
          rotate: false,
          translate: false,
          translation: {x: '0', y: '0', z: '0'},
          rotation: {x: '0', y: '0', z: '0'},
        };
        bufferToImport.ui = {
          showDetail: false,
          imported: false,
          importing: false
        };
        this.selectedFiles.push(bufferToImport);
      } else {
        if (!this.inputFileElement.files?.length) {
          throw new Error('Missing file');
        }
        for (let index = 0; index < this.inputFileElement.files.length; index++) {
          const file = this.inputFileElement.files.item(index) as FileToImport;
          file.settings = {
            context: 'gis',
            includePsets: this.includePsets,
            includeSiteObjects: this.includeSiteObjects,
            ignoreBuildings: this.ignoreBuildings,
            flatten: this.flatten,
            rotate: false,
            translate: false,
            translation: {x: '0', y: '0', z: '0'},
            rotation: {x: '0', y: '0', z: '0'},
          };
          file.ui = {
            showDetail: false,
            imported: false,
            importing: false
          };
          this.selectedFiles.push(file);
        }
      }

      this.importerService.filesToImport = this.selectedFiles;
      const scene = new Scene();
      const a: any = undefined;
      const b: any = undefined;
      const siteManager = new SiteManager(scene, a, b);
      siteManager.siteId = this.siteId;
      const site = await ThreeSiteModel.getOneWithId(this.siteId);
      if (!site) {
        throw new Error('Site not found');
      }
      console.log('here now');
      this.importerService.site = site;
      this.importerService.siteManager = siteManager;
      await siteManager.loadGIS();
      console.log('here now 2');
      this.message = 'GIS site loaded in the background';
      await this.importerService.importFiles();
      this.message = 'Files imported in the scene';
      await this.importerService.upload();
      this.message = 'Files uploaded'; // do not rename control value for revit plugin !!
    } catch (error) {
      console.error(error);
      this.error = error.message;
      this.message = '';
    }
  }

  
}
