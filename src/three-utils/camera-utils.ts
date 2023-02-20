import { Camera, Euler, Vector3, Box3, PerspectiveCamera, SphereBufferGeometry, MeshLambertMaterial, Mesh, Scene, ColorRepresentation } from 'three';
import { ThreeUtils } from '../aurelia-components/three-utils';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export interface CameraConfig {
  position: Vector3;
  rotation: Euler;
  target: Vector3;
  distance: number;
}

export class CameraUtils {

  constructor(private camera: Camera) {

  }

  public distanceToFit(bbox: Box3): number {
    if (this.camera instanceof PerspectiveCamera) {
      // const centroid = ThreeUtils.centroidFromBbox(bbox);

      const minX = bbox.max.x - bbox.min.x;
      const minZ = bbox.max.z - bbox.min.z;
      const size = Math.sqrt((minX * minX) + (minZ * minZ));
  
      // Convert camera fov degrees to radians
      const fov = this.camera.fov * ( Math.PI / 180 ); 
      const distance = Math.abs( (size / 2) / Math.tan( fov / 2 ) );
      return distance;
    } else {
      console.warn('lookAtBboxFromTop is not yet implemented for this type of camera', this.camera.type);
    }
  }

  public lookAtBboxFromOrientation(bbox: Box3, orientation: Vector3, marginFactor = 1.2): CameraConfig {

    if (this.camera instanceof PerspectiveCamera) {
      const target = ThreeUtils.centroidFromBbox(bbox);
      const distance = this.distanceToFit(bbox) * marginFactor;

      return {
        target,
        distance,
        position: target.clone().add(orientation.clone().normalize().negate().setLength(distance)),
        rotation: new Euler(orientation.x, orientation.y, orientation.z)
      };

    } else {
      console.warn('lookAtBboxFromTop is not yet implemented for this type of camera', this.camera.type);
    }
  }

}
