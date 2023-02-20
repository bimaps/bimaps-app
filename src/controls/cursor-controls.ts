import * as THREE from 'three';

export interface PlanesIntersects {
  xy: THREE.Vector3 | null;
  xz: THREE.Vector3 | null;
  yz: THREE.Vector3 | null;
}

export type MOUSE_EVENTS_TYPES = 'down' | 'move' | 'up' | 'leave';

const MOUSE_EVENTS_TYPES_MAP = new Map<string, MOUSE_EVENTS_TYPES>();
MOUSE_EVENTS_TYPES_MAP.set('mousemove', 'move');
MOUSE_EVENTS_TYPES_MAP.set('mouseleave', 'leave');
MOUSE_EVENTS_TYPES_MAP.set('mouseup', 'up');
MOUSE_EVENTS_TYPES_MAP.set('mousedown', 'down');

export interface CursorPlanesIntersects {
  type: Omit<MOUSE_EVENTS_TYPES, 'leave'>;
  intersects: PlanesIntersects;
  mouse: THREE.Vector2;
}

export class CursorControls extends THREE.EventDispatcher {

  public useClippingPlanes = true;
  public shouldHandlePlanesIntersects = true;
  public shouldHandleObjectsIntersect = true;
  public shouldHandleOpacity0 = false;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private previousMousePosition?: THREE.Vector2;

  private planeXY = new THREE.Plane(new THREE.Vector3(0, 0, 1));
  private planeXZ = new THREE.Plane(new THREE.Vector3(0, 1, 0));
  private planeYZ = new THREE.Plane(new THREE.Vector3(1, 0, 0));

  private pointXY = new THREE.Vector3;
  private pointXZ = new THREE.Vector3;
  private pointYZ = new THREE.Vector3;

  private intersectPlaneXY: THREE.Vector3;
  private intersectPlaneXZ: THREE.Vector3;
  private intersectPlaneYZ: THREE.Vector3;

  private frontDistance?: number;
  private backDistance?: number;
  
  constructor(private scene: THREE.Scene, private camera: THREE.Camera, private renderer: THREE.WebGLRenderer, public threshold = 5) {
    super();
    this.renderer.domElement.addEventListener('mousedown', this, {passive: true});
    this.renderer.domElement.addEventListener('mousemove', this, {passive: true});
    this.renderer.domElement.addEventListener('mouseup', this, {passive: true});
    this.renderer.domElement.addEventListener('mouseleave', this, {passive: true});
  }

  public dispose(): void {
    this.renderer.domElement.removeEventListener('mousedown', this);
    this.renderer.domElement.removeEventListener('mousemove', this);
    this.renderer.domElement.removeEventListener('mouseup', this);
    this.renderer.domElement.removeEventListener('mouseleave', this);
  }

  public handleEvent(event: Event & {target: HTMLElement}): void {
    if (event instanceof MouseEvent && event.target.tagName === 'CANVAS') {
      this.handleMouseEvent(event);
    }
  }

  private handleMouseEvent(event: MouseEvent & {target: HTMLElement}): void {
    // currently supporting only main-button click
    if (event.button !== 0) {
      return;
    }
    const target = event.target;
    
    const type = MOUSE_EVENTS_TYPES_MAP.get(event.type);
    if (type === 'leave') {
      this.handleMouseLeave();
    } else if (type === undefined) {
      return;
    }

    if (event.clientX && event.clientY && target?.getBoundingClientRect) {
      const rect = target.getBoundingClientRect();
      const x = event.clientX - rect.left; // x position within the element.
      const y = event.clientY - rect.top;  // y position within the element.
      this.mouse.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
      this.mouse.y = -(y / this.renderer.domElement.clientHeight) * 2 + 1;
    } else if (this.previousMousePosition) {
      this.mouse = this.previousMousePosition;
    } else {
      return;
    }

    this.previousMousePosition = this.mouse;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.params.Line.threshold = this.threshold;
    this.raycaster.params.Points.threshold = this.threshold;

    
    if (this.shouldHandlePlanesIntersects) {
      this.handlePlanesIntesects(type);
    }
    if (this.useClippingPlanes) {
      this.setDistanceUsingClippingPlanes();
    } else {
      this.frontDistance = undefined;
      this.backDistance = undefined;
    }
    if (this.shouldHandleObjectsIntersect) {
      this.handleObjectsIntersect(type);
    }
  }

  private handleMouseLeave() {
    this.previousMousePosition = undefined;
  }

  private handlePlanesIntesects(type: Omit<MOUSE_EVENTS_TYPES, 'leave'>): void {
    this.intersectPlaneXY = this.raycaster.ray.intersectPlane(this.planeXY, this.pointXY);
    this.intersectPlaneXZ = this.raycaster.ray.intersectPlane(this.planeXZ, this.pointXZ);
    this.intersectPlaneYZ = this.raycaster.ray.intersectPlane(this.planeYZ, this.pointYZ);

    const planesIntersects: PlanesIntersects = {
      xy: this.intersectPlaneXY,
      xz: this.intersectPlaneXZ,
      yz: this.intersectPlaneYZ
    };

    const cursorPlanesIntersects: CursorPlanesIntersects = {
      type,
      intersects: planesIntersects,
      mouse: this.mouse
    };

    this.dispatchEvent({ type: 'planes-intersects', cursorPlanesIntersects, gestureType: type, scene: THREE.Scene, position: this.mouse });
  }

  /**
   * Sets the front and back distance of the raycaster according to current global clipping planes attached to the renderer
   */
  private setDistanceUsingClippingPlanes(): void {
    this.frontDistance = undefined;
    this.backDistance = undefined;
    const clippingPlanes = this.renderer.clippingPlanes || [];

    if (clippingPlanes.length > 0) {
      for (const plane of clippingPlanes) {
        const cameraDirection = new THREE.Vector3( 0, 0, - 1 ).applyQuaternion(this.camera.quaternion);
        const normalProjected = plane.normal.clone().projectOnVector(cameraDirection);
        const angle = cameraDirection.angleTo(normalProjected);
        const direction = (angle > 0.1) ? 'BACK' : 'FRONT';
        const intersection = this.raycaster.ray.intersectPlane(plane, new THREE.Vector3);
        const distance = intersection ? intersection.sub(this.camera.position).length() : 0;

        if (direction === 'FRONT') {
          if (this.frontDistance === undefined) {
            this.frontDistance = distance;
          } else {
            this.frontDistance = Math.max(this.frontDistance, distance);
          }
        }

        if (direction === 'BACK') {
          if (this.backDistance === undefined) {
            this.backDistance = distance;
          } else {
            this.backDistance = Math.min(this.backDistance, distance);
          }
        }
      }
    }
  }

  /**
   * Calculate the front and back distance of the raycaster using the local (material) clipping planes
   * if the renderer localClippingEnabled set to `true`
   */
  private getLocalDistanceUsingMaterialClippingPlanes(object: THREE.Object3D): {frontDistance: number | undefined, backDistance: number | undefined} {
    let frontDistance = undefined;
    let backDistance = undefined;
    const isMesh = object instanceof THREE.Mesh;
    if (this.renderer.localClippingEnabled === false || !isMesh) {
      return {frontDistance, backDistance};
    }

    const clippingPlanes: THREE.Plane[] = [];

    const material = (object as THREE.Mesh).material;

    if (Array.isArray(material)) {
      for (const m of material) {
        clippingPlanes.push(...m.clippingPlanes || []);
      }
    } else {
      clippingPlanes.push(...material.clippingPlanes || []);
    }

    if (clippingPlanes.length > 0) {
      for (const plane of clippingPlanes) {
        const cameraDirection = new THREE.Vector3( 0, 0, - 1 ).applyQuaternion(this.camera.quaternion);
        const normalProjected = plane.normal.clone().projectOnVector(cameraDirection);
        const angle = cameraDirection.angleTo(normalProjected);
        const direction = (angle > 0.1) ? 'BACK' : 'FRONT';
        const intersection = this.raycaster.ray.intersectPlane(plane, new THREE.Vector3);
        const distance = intersection ? intersection.sub(this.camera.position).length() : 0;

        if (direction === 'FRONT') {
          if (frontDistance === undefined) {
            frontDistance = distance;
          } else {
            frontDistance = Math.max(frontDistance, distance);
          }
        }

        if (direction === 'BACK') {
          if (backDistance === undefined) {
            backDistance = distance;
          } else {
            backDistance = Math.min(backDistance, distance);
          }
        }
      }
    }

    // frontDistance = undefined;
    // backDistance = undefined;
    return {frontDistance, backDistance};
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public isObjectClickable(object: THREE.Object3D): boolean {
    if (object.type === 'GridHelper') {
      return false;
    }
    if (!this.shouldHandleOpacity0 && this.isOpacity0(object)) {
      return false;
    }
    return true;
  }

  private isOpacity0(object: THREE.Object3D): boolean {
    if (object instanceof THREE.Mesh) {
      const material = object.material;
      if (Array.isArray(material)) {
        const hasNon0Opacity = material.find(m => m.opacity !== 0 || m.transparent !== true);
        if (hasNon0Opacity) {
          return false;
        }
        return true;
      } else {
        return material.opacity === 0 && material.transparent === true;
      }
    }
    return false;
  }

  // TODO: handle local (material) clipping planes as well
  private handleObjectsIntersect(type: Omit<MOUSE_EVENTS_TYPES, 'leave'>): void {
    const clickableObjects: Array<THREE.Object3D> = [];

    this.scene.traverse((object) => {
      if (this.isObjectClickable(object)) {
        clickableObjects.push(object);
      }
    });
    
    let objectsIntersects = this.raycaster.intersectObjects(clickableObjects, false);

    if (this.backDistance || this.frontDistance || this.renderer.localClippingEnabled) {
      const newObjectsIntersects: Array<THREE.Intersection> = [];
      for (const intersect of objectsIntersects) {
        let pick = true;

        const globalBackDistance = this.backDistance;
        const globalFrontDistance = this.frontDistance;
        const {backDistance: localBackDistance, frontDistance: localFrontDistance} = this.getLocalDistanceUsingMaterialClippingPlanes(intersect.object);

        const backDistance = globalBackDistance !== undefined && localBackDistance !== undefined ? Math.min(globalBackDistance, localBackDistance) : globalBackDistance || localBackDistance;
        const frontDistance = globalFrontDistance !== undefined && localFrontDistance !== undefined ? Math.max(globalFrontDistance, localFrontDistance) : globalFrontDistance || localFrontDistance;

        if (backDistance !== undefined && intersect.distance > backDistance) {
          pick = false;
        } else if (frontDistance !== undefined && intersect.distance < frontDistance) {
          pick = false;
        }
        if (pick) {
          newObjectsIntersects.push(intersect);
        }
      }
      objectsIntersects = newObjectsIntersects;
    }

    this.dispatchEvent({ type: 'objects-intersects', objectsIntersects, gestureType: type, scene: THREE.Scene, position: this.mouse });
  }

}
