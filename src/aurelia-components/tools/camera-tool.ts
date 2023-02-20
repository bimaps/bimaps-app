import { BaseTool } from './base-tool';
import { EventAggregator } from 'aurelia-event-aggregator';
import { inject, bindable, bindingMode } from 'aurelia-framework';
import { Three } from '../three';
import { Vector3 } from 'three';
import { ThreeUtils } from '../three-utils';
import { SiteManager } from '../site-manager';
import { CameraUtils } from '../../three-utils/camera-utils';

@inject(EventAggregator, Three)
export class CameraTool extends BaseTool {

  @bindable({defaultBindingMode: bindingMode.toView}) private siteManager: SiteManager;

  cameraUtils: CameraUtils;

  constructor(eventAggregator: EventAggregator, private three: Three) {
    super(eventAggregator);
    
    // this.hoverBoxPosition = 'next-toolbar';
  }


  public attached(): void {
    super.attached();
    this.cameraUtils = new CameraUtils(this.three.scene.camera);
  }

  public top(): void {

    if (!this.siteManager) {
      return;
    }
    const bboxOfSite = ThreeUtils.bboxFromObject(this.siteManager.siteObject).applyMatrix4(this.siteManager.siteObject.matrixWorld);
    const config = this.cameraUtils.lookAtBboxFromOrientation(bboxOfSite, new Vector3(0, -1, 0));  
    this.three.scene.controls.target.copy(config.target);
    this.three.scene.camera.position.copy(config.position);
    this.three.scene.camera.rotation.copy(config.rotation);
    this.log();
  }

  public nav3d(): void {
    if (!this.siteManager) {
      return;
    }
    const bboxOfSite = ThreeUtils.bboxFromObject(this.siteManager.siteObject).applyMatrix4(this.siteManager.siteObject.matrixWorld);
    const config = this.cameraUtils.lookAtBboxFromOrientation(bboxOfSite, new Vector3(-1, -0.5, -1));  
    this.three.scene.controls.target.copy(config.target);
    this.three.scene.camera.position.copy(config.position);
    this.three.scene.camera.rotation.copy(config.rotation);
    this.log();
  }

  public log(): void {
    console.log('Camera', this.three.scene.camera);
    console.log('Camera position', this.three.scene.camera.position);
    console.log('Camera rotation', this.three.scene.camera.rotation);
    console.log('Camera fov', this.three.scene.camera.fov);
    console.log('Camera zoom', this.three.scene.camera.zoom);
  }
  
}
