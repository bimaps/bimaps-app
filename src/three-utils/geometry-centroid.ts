import { ThreeUtils } from './../aurelia-components/three-utils';
import { BufferGeometry, Box3, Vector3 } from 'three';
export function bboxGeometry(geometry: BufferGeometry): Box3 {
  const vertices = ThreeUtils.getBufferGeometryVertices(geometry);
  const bbox = new Box3(
    new Vector3(
      Math.min(...vertices.map(v => v.x)),
      Math.min(...vertices.map(v => v.y)),
      Math.min(...vertices.map(v => v.z)),
    ),
    new Vector3(
      Math.max(...vertices.map(v => v.x)),
      Math.max(...vertices.map(v => v.y)),
      Math.max(...vertices.map(v => v.z)),
    ),
  );
  return bbox;
}

export function centroidGeometry(geometry: BufferGeometry): Vector3 {
  return ThreeUtils.centroidFromBbox(bboxGeometry(geometry));
}
