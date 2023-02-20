import { Scene, EventDispatcher, MeshLambertMaterial } from 'three';
import { CursorControls } from '../controls/cursor-controls';
import { IFCManager } from 'web-ifc-three/IFC/components/IFCManager';

export class IfcJsSelectControls extends EventDispatcher {

  constructor(
    private scene: Scene,
    private cursorControls?: CursorControls) {
    super();
    this.cursorControls.addEventListener('objects-intersects', this.handler);
  }

  public dispose() {
    this.cursorControls.removeEventListener('objects-intersects', this.handler);
  }

  public handler = async (data: {type: 'objects-intersects', target: CursorControls, gestureType: 'down' | 'up' | 'move', objectsIntersects: THREE.Intersection[]}) => {
    if (data.gestureType === 'down' && data.objectsIntersects.length > 0) {
      for (const intersection of data.objectsIntersects) {
        const object: (THREE.Object3D & {ifcManager?: IFCManager, geometry?: THREE.BufferGeometry, modelID?: number}) = intersection.object;
        if (object.ifcManager && object.geometry && object.modelID !== undefined) {
          const expressId = await object.ifcManager.getExpressId((object.geometry as any), intersection.faceIndex);
          const subset = object.ifcManager.createSubset({
            scene: this.scene as any,
            modelID: object.modelID,
            ids: [expressId],
            removePrevious: true,
            material: this.highlightMaterial as any
          });
          break;
        }
      }
    }
  }

  private highlightMaterial = new MeshLambertMaterial({
    transparent: true,
    opacity: 0.6,
    color: 0xff88ff,
    depthTest: false
  });

}
