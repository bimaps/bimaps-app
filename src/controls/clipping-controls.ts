import { ColorRepresentation, Camera, WebGLRenderer, Object3D, Mesh, EventDispatcher, Scene, Vector3, MeshBasicMaterial, Plane, PlaneGeometry, DoubleSide, Intersection } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { CursorControls } from './cursor-controls';

export class ClippingControls extends EventDispatcher {

  public planeSize = 10;
  private helpers: ClippingPlaneHelper[] = [];
  private clippingToolsScene = new Scene();
  private cursorControls: CursorControls;

  constructor(
    private camera: Camera,
    private renderer: WebGLRenderer,
    private orbitControls?: OrbitControls) {
    super();
    this.cursorControls = new CursorControls(this.clippingToolsScene, camera, renderer);
    this.cursorControls.useClippingPlanes = false;
    this.setupAnimation();
    this.handleClickedObject();
  }

  public setupAnimation = (): void => {
    const slicingPlanes = this.renderer.clippingPlanes;
    this.renderer.clippingPlanes = [];
    this.renderer.autoClear = false;
    this.renderer.render(this.clippingToolsScene, this.camera);
    this.renderer.autoClear = true;
    this.renderer.clippingPlanes = slicingPlanes;
    requestAnimationFrame(this.setupAnimation);
  }

  public handleClickedObject(): void {
    this.cursorControls.addEventListener('objects-intersects', async (data: {type: 'objects-intersects', target: CursorControls, gestureType: 'down' | 'up' | 'move', objectsIntersects: Intersection[]}) => {
      if (data.gestureType === 'down' && data.objectsIntersects.length > 0) {
        for (const intersection of data.objectsIntersects) {
          const object = intersection.object;
          if (object.parent instanceof ClippingPlaneHelper) {
            const helper = object.parent;
            this.startControlling(helper);
          }
        }
      }
    });
  }

  public getClippingToolsScene(): Scene {
    return this.clippingToolsScene;
  }

  public getCamera(): Camera {
    return this.camera;
  }

  public getRenderer(): WebGLRenderer {
    return this.renderer;
  }

  public getOrbitControls(): OrbitControls {
    return this.orbitControls;
  }

  public addClippingPlane(normal?: Vector3, origin?: Vector3, startControlling?: boolean): ClippingPlaneHelper {
    const plane = new Plane(normal || new Vector3(1, 0, 0));
    const helper = new ClippingPlaneHelper(this, plane, origin || new Vector3(0, 0, 0), this.planeSize);
    this.renderer.clippingPlanes.push(helper.plane);
    this.clippingToolsScene.add(helper);
    this.helpers.push(helper);
    if (startControlling !== false) {
      this.startControlling(helper);
    }
    return helper;
  }

  public removeClippingPlane(helper: ClippingPlaneHelper): void {
    const index = this.renderer.clippingPlanes.indexOf(helper.plane);
    if (index !== -1) {
      helper.stopControlling();
      this.clippingToolsScene.remove(helper);
      this.renderer.clippingPlanes.splice(index, 1);
      this.helpers.splice(index, 1);
    }
  }

  public clearClippingPlanes(): void {
    for (const helper of this.helpers) {
      this.removeClippingPlane(helper);
    }
  }

  public displayPlaneHelpers(): void {
    for (const helper of this.helpers) {
      helper.visible = true;
    }
  }

  public hidePlaneHelpers(): void {
    for (const helper of this.helpers) {
      helper.visible = false;
      helper.stopControlling();
    }
  }

  public allowPlaneTransform(): void {
    for (const helper of this.helpers) {
      helper.allowTransform = true;
    }
  }

  public disallowPlaneTransform(): void {
    for (const helper of this.helpers) {
      helper.allowTransform = false;
    }
  }

  public startControlling(helper: ClippingPlaneHelper): void {
    for (const _helper of this.helpers) {
      if (helper !== _helper) {
        _helper.stopControlling();
      } else {
        _helper.startControlling();
      }
    }
  }

  public stopControlling(): void {
    for (const helper of this.helpers) {
      if (helper.getIsControlling()) {
        helper.stopControlling();
      }
    }
  }

  public invert(): void {
    for (const helper of this.helpers) {
      if (helper.getIsControlling()) {
        helper.invert();
      }
    }
  }

  public setMode(mode: 'translate' | 'rotate'): void {
    for (const helper of this.helpers) {
      if (helper.getIsControlling()) {
        helper.setMode(mode);
      }
    }
  }

  public get isControlling(): boolean {
    return this.helpers.findIndex(h => h.getIsControlling()) !== -1;
  }

  public get isClipping(): boolean {
    return this.helpers.length > 0;
  }

  
}

export class ClippingPlaneHelper extends Object3D {

  public allowTransform = true;
  private isControlling = false;
  private controls: TransformControls;
  private planeColor: ColorRepresentation = 0xffff00;

  public static planeColors: ColorRepresentation[] = [
    0xffff00,
    0x00ff00,
    0x0000ff,
    0x00ffff,
    0xff00ff,
    0xff0000,
  ];
  private static autoPlaneColorIndex = 0;

  constructor(
    private clippingControls: ClippingControls,
    public plane: Plane,
    origin: Vector3,
    private planeSize: number,
    planeColor: ColorRepresentation | 'auto' = 'auto') {
    super();
    this.lookAt(plane.normal);
    this.position.copy(origin);
    if (planeColor === 'auto') {
      this.planeColor = ClippingPlaneHelper.planeColors[ClippingPlaneHelper.autoPlaneColorIndex];
      ClippingPlaneHelper.autoPlaneColorIndex++;
      if (ClippingPlaneHelper.autoPlaneColorIndex >= ClippingPlaneHelper.planeColors.length) {
        ClippingPlaneHelper.autoPlaneColorIndex = 0;
      }
    } else {
      this.planeColor = planeColor;
    }
    this.add(this.getMesh());
  }

  private getMesh() {
    const planeGeom = new PlaneGeometry(this.planeSize, this.planeSize, 1);
    const planeMaterial = new MeshBasicMaterial({
      color: this.planeColor,
      side: DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    return new Mesh(planeGeom, planeMaterial);
  }

  public startControlling(): void {
    if (this.isControlling) {
      return;
    }

    this.controls = new TransformControls(this.clippingControls.getCamera(), this.clippingControls.getRenderer().domElement);
    this.setMode('translate');
    this.controls.attach(this);
    this.controls.setSpace('local');
    this.clippingControls.getClippingToolsScene().add(this.controls);

    this.controls.addEventListener('change', () => {      
      this.plane.setFromNormalAndCoplanarPoint(this.plane.normal, this.position);
    });
    this.controls.addEventListener('dragging-changed', (event: {type: 'dragging-changed', value: boolean, target: TransformControls}) => {
      this.clippingControls.getOrbitControls().enabled = !event.value;
    });

    this.isControlling = true;
    this.plane.setFromNormalAndCoplanarPoint(this.plane.normal, this.position);
  }

  public setMode(mode: 'translate' | 'rotate'): void {
    if (mode === 'translate') {
      this.controls.setMode('translate');
      this.controls.showX = false;
      this.controls.showY = false;
      this.controls.showZ = true;
    } else if (mode === 'rotate') {
      this.controls.setMode('rotate');
      this.controls.showX = true;
      this.controls.showY = true;
      this.controls.showZ = false;
    }
  }

  public invert(): void {
    this.plane.negate();
  }

  public stopControlling(): void {
    if (!this.isControlling) {
      return;
    }
    this.clippingControls.getClippingToolsScene().remove(this.controls);
    this.controls.dispose();
    this.isControlling = false;
  }

  public getIsControlling(): boolean {
    return this.isControlling;
  }


}
