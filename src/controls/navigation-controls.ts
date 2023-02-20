import { Camera, Object3D, EventDispatcher, Vector3, Box3, Euler } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ThreeUtils } from '../aurelia-components/three-utils';
import { CameraUtils } from '../three-utils/camera-utils';

export const Orientation = {
  "3d": new Vector3(-1, -0.5, -1),
  "top": new Vector3(0, -1, 0)
};

export class NavigationControls extends EventDispatcher {

  private cameraUtils: CameraUtils;

  constructor(
    private camera: Camera,
    private orbitControls?: OrbitControls) {
    super();
    this.cameraUtils = new CameraUtils(this.camera);
  }

  public zoomOnObject(object: Object3D, orientation = new Vector3(-1, -0.5, -1), marginFactor = 1.2, cameraRotation?: Euler): void {
    const bbox = ThreeUtils.bboxFromObject(object);
    this.zoomOnBbox(bbox, orientation, marginFactor, cameraRotation);
  }

  // TODO: maybe sometimes we want to "ensure" some sort of cameraRotation
  public zoomOnBbox(bbox: Box3, orientation = new Vector3(-1, -0.5, -1), marginFactor = 1.2, cameraRotation?: Euler): void {
    const cameraConfig = this.cameraUtils.lookAtBboxFromOrientation(bbox, orientation, marginFactor);
    this.orbitControls.target.copy(cameraConfig.target);
    this.camera.position.copy(cameraConfig.position);
    this.camera.rotation.copy(cameraConfig.rotation);
  }

}
