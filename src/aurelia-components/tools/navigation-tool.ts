import { SelectToolObjectEvent } from './select-tool';
import { NavigationService } from './navigation-service';
import { BaseTool } from './base-tool';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { inject, bindable, bindingMode } from 'aurelia-framework';
import { Three } from '../three';
import { Plane, Vector3, Object3D, Vector2, Shape, CatmullRomCurve3, ExtrudeGeometry, MeshLambertMaterial, Mesh, SphereBufferGeometry, DoubleSide, AmbientLight, PointLight} from 'three';
import { ThreeUtils } from '../three-utils';
import { SiteManager } from '../site-manager';
import { CameraUtils } from '../../three-utils/camera-utils';
import { Log } from '../../three-utils/log';

export interface NavigationToolNewPathEvent {
  from: Object3D;
  to: Object3D;
}

@inject(EventAggregator, Three)
export class NavigationTool extends BaseTool {

  @bindable({defaultBindingMode: bindingMode.toView}) private siteManager: SiteManager;

  cameraUtils: CameraUtils;
  private threeLogger: Log;
  
  private from: Object3D | undefined;
  private to: Object3D | undefined;

  private fromCentroid: Vector3;
  private toCentroid: Vector3;

  private percentage = '0';
  private playing = false;

  private originalCameraFOV: number;
  private immersiveNavigationFOV = 105;
  private navigationClippingPlane: Plane;
  private navigationCurve: CatmullRomCurve3;
  private navigationPathObject: Mesh;
  private navigationPointObject: Mesh;
  private navigationStyle: '3d' | 'immersive' = '3d';

  private subscriptions: Subscription[] = [];
  private navigationService: NavigationService;

  private currentStorey: Object3D | undefined;

  constructor(eventAggregator: EventAggregator, private three: Three) {
    super(eventAggregator);
    
    this.movePanelToBody = true;
    // this.hoverBoxPosition = 'next-toolbar';
  }


  public attached(): void {
    super.attached();
    this.cameraUtils = new CameraUtils(this.three.scene.camera);
    this.originalCameraFOV = this.three.scene.camera.fov;
    this.prepareNavigationStyles();
    this.threeLogger = new Log(this.three.scene.scene);
    this.navigationService = new NavigationService(this.three.scene.scene);

    this.subscriptions.push(this.eventAggregator.subscribe('aurelia-three:navigation:new-path', (data: NavigationToolNewPathEvent) => {
      if (data.from !== undefined) {
        this.from = data.from;
      }
      if (data.to !== undefined) {
        this.to = data.to;
      }
      
      // if from and to are identical we decide to keep only from
      if (this.to?.uuid === this.from?.uuid) {
        this.to = undefined;
      }
      this.startNav();
    }));
    this.subscriptions.push(this.eventAggregator.subscribe('aurelia-three:navigation:cancel-nav', (data: NavigationToolNewPathEvent) => {
      this.cancelNav();
    }));
    this.subscriptions.push(this.eventAggregator.subscribe('aurelia-three:select-tool:selected', (data: SelectToolObjectEvent) => {
      if (!this.isSelectingFrom && !this.isSelectingTo) {
        return;
      }
      this.eventAggregator.publish('aurelia-three:select-tool:deactivate');
      if (this.isSelectingTo) {
        this.to = data.object;
        this.isSelectingTo = false;
      } else if (this.isSelectingFrom) {
        this.from = data.object;
        this.isSelectingFrom = false;
      }
      this.startNav();
    }));
  }

  public name(object: Object3D): string {
    return object ? this.siteManager?.getObjectLabel(object) || '' : '';
  }

  private async startNav(): Promise<void> {
    
    this.siteManager.showMultiLevel = true;

    // when starting a nav we close the buildings
    // the site navigator is no longer responsible for the data of buildings
    this.eventAggregator.publish('aurelia-three:navigation-tool:update-storey', {});

    this.siteManager.toggleSliceAbove(false);
    const foundPath = this.calculateNavigationPath();
    if (!foundPath) {
      return;
    }
    
    await this.loadStartStorey();
    // TODO: awaiting here slows down the process
    // but currently it ensures that all BIM objects 
    // required for a nice navigation are properly loaded
    this.loadRequiredStoreys();

    this.toggleNavigationPathObject(false);
    this.toggleNavigationPathObject(true);

    if (!this.opened) {
      this.toggleOpened();
    }
  }

  private async loadStartStorey(): Promise<void> {
    const object = this.from || this.to;
    if (!object) {
      return;
    }
    await this.siteManager.loadBIM(object.userData.building, object.userData.storey, false);
  }

  private async loadRequiredStoreys(): Promise<void> {

    const storeysUUIDs: string[] = [];
    const promises: Promise<void>[] = [];
    for (const coordinate of this.navigationCoordinates) {
      // adding an extra 0.5 in y so that it ensures to go between the min/max of level y
      const point = coordinate.clone().add(new Vector3(0, +0.5, 0));
      const storeys = this.siteManager.findEligibleStoreysFromPosition(point);
      for (const storey of storeys) {
        if (!storeysUUIDs.includes(storey.uuid)) {
          promises.push(this.siteManager.loadBIM(storey.userData.building, storey.userData.storey, false).then(() => {
            this.three.stylingManager.apply();
          }));
          storeysUUIDs.push(storey.uuid);
        }
      }
    }
    await Promise.all(promises);
  }

  private calculateNavigationPath(): boolean {
    if (!this.to) {
      return false;
    }
    this.toCentroid = ThreeUtils.centroidFromObject(this.to);
    this.fromCentroid = this.from ? ThreeUtils.centroidFromObject(this.from) : this.navigationService.findClosestBuildingDoor(this.toCentroid);
    const path = this.navigationService.getPath(this.fromCentroid, this.toCentroid);
    if (!path) {
      return false;
    }
    this.setNavigationCoordinates(path.coordinates);
    this.percentage = '0';
    return true;
  }

  private prepareNavigationStyles(): void {
    this.three.stylingManager.registerStyle('navigation-transparent', [
      {
        conditionOperator: 'and',
        conditions: [
          {
            key: 'name',
            value: 'navigation-path',
            operator: '='
          }
        ],
        definitions: [
          {
            opacity: 0.2
          }
        ],
        applyToChildren: false
      }
    ], 10, false);
    if (!this.navigationClippingPlane) {
      this.navigationClippingPlane = new Plane(new Vector3(0, -1, 0), 0);
      (this.navigationClippingPlane as any).name = 'navigation-clipping-plane';
    }
    this.three.scene.renderer.localClippingEnabled = true;
    this.three.stylingManager.registerStyle('clip-above-nav', [
      {
        conditions: [
          {
            key: 'name',
            operator: '!=',
            value: 'navigation-path'
          },
          {
            key: 'name',
            operator: '!=',
            value: 'navigation-point'
          }
        ],
        conditionOperator: 'and',
        applyToChildren: false,
        definitions: [
          {
            clippingPlanes: [this.navigationClippingPlane]
          }
        ]
      }
    ], 50, false);
    this.three.stylingManager.registerStyle('display-bim-navigation', [
      {
        conditionOperator: 'and',
        conditions: [
          {
            key: 'userData.context',
            operator: '=',
            value: 'bim'
          }
        ],
        applyToChildren: false,
        definitions: [
          {
            visible: true,
            clippingPlanes: []
          }
        ]
      }
    ], 105, false);
  }

  private navigationCoordinates: Vector3[];
  public setNavigationCoordinates(navigationCoordinates: Vector3[]): void {
    this.navigationCoordinates = navigationCoordinates;
  }

  public toggleNavigationPathObject(force?: boolean): void {
    if (this.navigationPathObject && (force === undefined || force === false)) {
      this.navigationPathObject.removeFromParent();
      this.navigationPathObject = undefined;
      this.toggleNavigationPointObject(false);
    } else if ((!this.navigationPathObject && force === undefined) || force === true) {
      const points = [];
      for (const coordinate of this.navigationCoordinates || []) {
        points.push(coordinate.clone());
      }

      const shapePoints: Vector2[] = [];

      shapePoints.push(new Vector2(-0.1, -0.5));
      shapePoints.push(new Vector2(-0.1, 0.5));
      shapePoints.push(new Vector2(0.1, 0.5));
      shapePoints.push(new Vector2(0.1, -0.5));

      const shape1 = new Shape( shapePoints );
      // centripetal, chordal and catmullrom
      this.navigationCurve = new CatmullRomCurve3(points, false, 'catmullrom', 0.15);

      const extrudeSettings1 = {
        steps: 100,
        bevelEnabled: false,
        extrudePath: this.navigationCurve
      };
      const geometry = new ExtrudeGeometry( shape1, extrudeSettings1 );
      const material = new MeshLambertMaterial( { color: 0x0000ff, wireframe: false, depthTest: true, side: DoubleSide } );
      const mesh = new Mesh( geometry, material );
      // mesh.renderOrder = 10; // renderOrder not used, as it changes the way depthTest works
      mesh.name = 'navigation-path';
      mesh.position.setY(0.11);
      this.navigationPathObject = mesh;
      this.three.scene.scene.add(mesh);
      this.setNavigationStyle(this.navigationStyle);
      this.eventAggregator.publish('aurelia-three:navigation:new-nav');
      // this.applyNavigationStyle();
    }
  }

  private toggleNavigationPointObject(force?: boolean): void {
    if (this.navigationPointObject && (force === undefined || force === false)) {
      this.navigationPointObject.removeFromParent();
      this.navigationPointObject = undefined;
    } else if ((!this.navigationPointObject && force === undefined) || force === true) {
      const geometry = new SphereBufferGeometry(0.2);
      const material = new MeshLambertMaterial({color: 'orange', side: DoubleSide, depthTest: false});
      this.navigationPointObject = new Mesh(geometry, material);
      this.navigationPointObject.name = 'navigation-point';
      this.navigationPointObject.renderOrder = 10;
      this.navigationPointObject.name = 'navigation-point';
      this.three.scene.scene.add(this.navigationPointObject);
    }
  }

  public setNavigationStyle(navigationStyle: '3d' | 'immersive'): void {
    this.navigationStyle = navigationStyle;
    if (this.navigationStyle === '3d') {
      this.three.scene.camera.fov = this.originalCameraFOV;
      this.three.scene.camera.updateProjectionMatrix();
      this.three.navigationControls.zoomOnObject(this.navigationPathObject, new Vector3(-1, -0.5, 1), 2.5);
    }
    this.applyNavigationStyle();
  }

  public applyNavigationStyle(): void {
    if (!this.navigationPathObject) {
      this.toggleNavigationPointObject(false);
      this.three.stylingManager.deactivateStyle('building-transparent');
      this.three.stylingManager.deactivateStyle('navigation-transparent');
      this.three.stylingManager.deactivateStyle('clip-above-nav');
      this.three.stylingManager.deactivateStyle('display-bim-navigation');
      this.three.stylingManager.apply();
      return;
    }
    
    if (this.navigationStyle === '3d') {
      this.toggleNavigationPointObject(true);
      this.three.stylingManager.deactivateStyle('building-transparent');
      this.three.stylingManager.activateStyle('navigation-transparent');
      this.three.stylingManager.activateStyle('clip-above-nav');
      this.three.stylingManager.activateStyle('display-bim-navigation');
      
    } else /* immersive */ {
      this.toggleNavigationPointObject(false);
      this.three.stylingManager.deactivateStyle('building-transparent');
      this.three.stylingManager.activateStyle('navigation-transparent');
      this.three.stylingManager.deactivateStyle('clip-above-nav');  
      this.three.stylingManager.activateStyle('display-bim-navigation');
      this.three.scene.camera.fov = this.immersiveNavigationFOV;
      this.three.scene.camera.updateProjectionMatrix();
    }
    this.updateNavigationPosition();
    this.three.stylingManager.apply();
  }

  public updateNavigationPosition(): void {
    const percentage: number = parseFloat(this.percentage);
    const point = this.navigationCurve.getPoint(percentage).add(new Vector3(0, 1.5, 0));

    this.currentStorey = this.siteManager.findStoreyFromPosition(point);
    // at first here the goal was to completely handle the labeling of the current
    // builing and storey to the site-navigator tool. However this tool is currently
    // also responsible for loading BIM data and styling the scene (through the site manager)
    // but this should not happen while in navigation mode
    // So now we need to decide how to handle the labeling of the building / storey
    // either from this navigation tool or change the site-navigator tool so that it does
    // not always handle the BIM loading

    
    if (this.navigationStyle === '3d') {
      this.navigationPointObject.position.copy(point);

      // clipping plane
      const clipHeight = point.y + 0.3;
      this.navigationClippingPlane.constant = clipHeight;

    } else /* immersive */ {

      this.threeLogger.clearPoints();
      // update camera position
      const length = this.navigationCurve.getLength();
      const percentageAdd = 5 / length;

      // point3 is a point 3m further in the navigation path
      const point3 = this.navigationCurve.getPoint(Math.min(percentage + percentageAdd, 1)).add(new Vector3(0, 1.5, 0));

      // point2 is a point 1m before in the navigation path (using tangent)
      const point2 = point.clone().sub(point3.clone().sub(point).normalize().setLength(0.5));

      this.three.scene.camera.position.copy(point2);
      this.three.scene.camera.lookAt(point3.sub(new Vector3(0, 0, 0)));
      this.three.scene.controls.target.copy(point3.clone().setY(point2.y));
      this.three.scene.controls.update();
    }
  }

  public logAllPaths(): void {
    this.navigationService.logAllPaths(this.three.scene.scene);
  }

  private playingInterval;
  private playingIntervalTimeout = 40;
  private playingDistance = 0.13;
  public togglePlaying(): void {
    this.playing = !this.playing;
    if (!this.playing && this.playingInterval) {
      clearInterval(this.playingInterval);
      this.three.scene.controls.update();
    } else {
      this.setNavigationStyle('immersive');
      clearInterval(this.playingInterval); // clearing to make SURE there are not interval left
      this.playingInterval = setInterval(() => {
        this.animate();
      }, this.playingIntervalTimeout);
    }
  }

  private animate(): void {
    const increment = this.playingDistance / this.navigationCurve.getLength();
    const percentage = parseFloat(this.percentage);
    if (percentage >= 1 - (2 * increment)) { // this offset from 1 is so that the camera can correctly find a "next point" to look at on the curve
      if (this.playing) {
        this.togglePlaying();
      }
      return;
    }
    const newPercentage = Math.min(1, percentage + increment);
    this.updateNavigationPosition();
    this.percentage = `${newPercentage}`;
  }

  public cancelNav(): void {
    this.toggleNavigationPathObject(false);
    this.applyNavigationStyle();
    if (this.opened) {
      this.toggleOpened();
    }
    if (this.playing) {
      this.togglePlaying();
    }
    this.threeLogger.clearAll();
    
    this.siteManager.showMultiLevel = false;
  }

  private isSelectingFrom = false;
  private isSelectingTo = false;
  public selectFrom(): void {
    this.isSelectingTo = false;
    this.isSelectingFrom = !this.isSelectingFrom;
    this.eventAggregator.publish('aurelia-three:select-tool:activate');
  }
  public selectTo(): void {
    this.isSelectingFrom = false;
    this.isSelectingTo = !this.isSelectingTo;
    this.eventAggregator.publish('aurelia-three:select-tool:activate');
  }

  public revert(): void {
    const event: NavigationToolNewPathEvent = {
      from: this.to,
      to: this.from
    }
    this.eventAggregator.publish('aurelia-three:navigation:new-path', event);    
  }
  
}
