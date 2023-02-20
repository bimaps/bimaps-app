import { Scene, Matrix4, Mesh, BufferGeometry, Quaternion, Vector3 } from 'three';
import { ThreeUtils } from '../aurelia-components/three-utils';
import * as md5 from 'md5';

interface ObjectPotentialOptimization {
  object: Mesh;
  geometrySignature: string;
  centeredGeometry: BufferGeometry;
  relatedObjects: Mesh[];
  translationTowardGeometry: Matrix4;
  originalGeometry: BufferGeometry;
}
export class OptimizeGeometries {

  constructor(private scene: Scene) {

  }

  public async findIdenticalGeometries(): Promise<void> {

    const geometrySignatures: {
      [key: string]: {
        geometry: BufferGeometry,
        objects: ({
          mesh: Mesh,
          translationMatrix: Matrix4
        })[]
      }} = {};
    const objectsPotentialOptimizations: ObjectPotentialOptimization[] = [];

    this.scene.traverse((object) => {
      const type = object.userData.properties?.type;
      if (['IFCSITE', 'IFCPROJECT', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSPACE'].includes(type)) {
        return;
      }
      if (object instanceof Mesh && object.geometry instanceof BufferGeometry) {
        const cloned = object.geometry.clone();
        const matrix = new Matrix4();
        const translationMatrix = this.translateToCenter(cloned);
        if (translationMatrix) {
          matrix.multiply(translationMatrix);
        }
        const positionValues: number[] = [];
        for (let index = 0; index < cloned.attributes.position.array.length; index++) {
          positionValues.push(Math.round(cloned.attributes.position.array[index] * 100) / 100);
        }
        const signature = md5(positionValues.join(','));

        if (!geometrySignatures[signature]) {
          geometrySignatures[signature] = {
            geometry: cloned,
            objects: []
          };
        }
        geometrySignatures[signature].objects.push({mesh: object, translationMatrix});
        objectsPotentialOptimizations.push({
          object,
          geometrySignature: signature,
          centeredGeometry: geometrySignatures[signature].geometry,
          relatedObjects: geometrySignatures[signature].objects.map(o => o.mesh),
          translationTowardGeometry: translationMatrix,
          originalGeometry: object.geometry.clone()
        });
      }
    });

    console.info('Optimizing geometries');
    console.info('Found', Object.keys(geometrySignatures).length, 'geometries amongst', objectsPotentialOptimizations.length, 'meshes');
    console.info(objectsPotentialOptimizations.filter(o => o.relatedObjects.length > 1).length, 'objects have the potential to be optimized');
    console.info('geometrySignatures', geometrySignatures);
    console.info('objectsPotentialOptimizations', objectsPotentialOptimizations);
    console.info('objectsPotentialOptimizations with several objects', objectsPotentialOptimizations.filter(o => o.relatedObjects.length > 1));
    for (const signature in geometrySignatures) {
      const geometrySignature = geometrySignatures[signature];
      if (geometrySignature.objects.length <= 1) {
        continue;
      }
      console.debug('Optimizing', geometrySignature.objects.length, 'objects geometry with signatuer', signature);
      for (const object of geometrySignature.objects) {

        const matrix = new Matrix4();
        matrix.multiply(object.translationMatrix);
        matrix.invert();

        object.mesh.geometry = geometrySignature.geometry;
        object.mesh.position.applyMatrix4(matrix);
        object.mesh.updateMatrix();
        object.mesh.updateMatrixWorld();
      }
    }
  }


  public async findIdenticalGeometriesY(): Promise<void> {
    const geometriesSignatures: string[] = [];
    const geometriesBySignature: {[key: string]: BufferGeometry} = {};
    let nbGeom = 0;

    const json1 = this.scene.toJSON();
    console.log('nb geometries first', json1.geometries.length);

    let nbGeomOptimizedWithChildren = 0;

    this.scene.traverse((object) => {
      const type = object.userData.properties?.type;
      if (['IFCSITE', 'IFCPROJECT', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSPACE'].includes(type)) {
        return;
      }
      if (object instanceof Mesh && object.geometry instanceof BufferGeometry) {
        nbGeom++;
        const cloned = object.geometry.clone();
        const matrix = new Matrix4();

        const rotationMatrix = null; //this.alignWithVertice(cloned);
        const translationMatrix = this.translateToCenter(cloned);

        if (rotationMatrix) {
          matrix.multiply(rotationMatrix);
        }
        if (translationMatrix) {
          matrix.multiply(translationMatrix);
        }

        const positionValues: number[] = [];
        for (let index = 0; index < cloned.attributes.position.array.length; index++) {
          positionValues.push(Math.round(cloned.attributes.position.array[index] * 100) / 100);
        }
        const signature = md5(positionValues.join(','));

        if (!geometriesSignatures.includes(signature)) {
          geometriesSignatures.push(signature);
          geometriesBySignature[signature] = cloned;
        } else {
          if (object.children?.length) {
            nbGeomOptimizedWithChildren += 1;
          }
        }

        object.geometry = geometriesBySignature[signature];
        matrix.invert();

        if (object.parent) {
          object.parent.updateMatrixWorld(true);
          const parentMatrix = object.parent.matrixWorld;
          parentMatrix.invert();
          matrix.multiply(parentMatrix);
        }

        object.position.applyMatrix4(matrix);
        object.matrixWorldNeedsUpdate = true;
      }
    });
    
    const json2 = this.scene.toJSON();
    console.log('nb geometries after', json2.geometries.length);
    console.log('nbGeomOptimizedWithChildren', nbGeomOptimizedWithChildren);
    // this timeout allow for matrix to be updated
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  public async findIdenticalGeometriesX(): Promise<void> {
    const geometriesSignatures: string[] = [];
    const geometriesBySignature: {[key: string]: BufferGeometry} = {};
    let nbGeom = 0;

    const json1 = this.scene.toJSON();
    console.log('nb geometries first', json1.geometries.length);

    this.scene.traverse((object) => {
      const type = object.userData.properties?.type;
      if (['IFCSITE', 'IFCPROJECT', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSPACE'].includes(type)) {
        return;
      }
      if (object instanceof Mesh && object.geometry instanceof BufferGeometry) {
        nbGeom++;

        const cloned = object.geometry.clone();
        object.updateMatrixWorld(true);
        // translate the cloned geometry as if the object was at 0,0,0
        const originalPositionMatrix = object.matrixWorld.clone()
        cloned.applyMatrix4(originalPositionMatrix);

        const matrix = new Matrix4();

        const rotationMatrix = null; //this.alignWithVertice(cloned);
        const translationMatrix = this.translateToCenter(cloned);

        if (rotationMatrix) {
          matrix.multiply(rotationMatrix);
        }
        if (translationMatrix) {
          matrix.multiply(translationMatrix);
        }

        const positionValues: number[] = [];
        for (let index = 0; index < cloned.attributes.position.array.length; index++) {
          positionValues.push(Math.round(cloned.attributes.position.array[index] * 100) / 100);
        }
        const signature = md5(positionValues.join(','));

        if (!geometriesSignatures.includes(signature)) {
          geometriesSignatures.push(signature);
          geometriesBySignature[signature] = cloned;
        }

        object.geometry = geometriesBySignature[signature];
        matrix.invert();

        object.position.applyMatrix4(matrix);
        object.updateMatrixWorld(true);
        object.matrixWorldNeedsUpdate = true;
      }
    });
    
    const json2 = this.scene.toJSON();
    console.log('nb geometries after', json2.geometries.length);
    // this timeout allow for matrix to be updated
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private translateToCenter(geometry: BufferGeometry): Matrix4 {
    if (!geometry.boundingBox) {
      geometry.computeBoundingBox();
    }
    if (!geometry.boundingBox) {
      return new Matrix4();
    }
    const center = new Vector3(
      (geometry.boundingBox.max.x + geometry.boundingBox.min.x) / 2,
      (geometry.boundingBox.max.y + geometry.boundingBox.min.y) / 2,
      (geometry.boundingBox.max.z + geometry.boundingBox.min.z) / 2,
      );
    center.negate();
    const translation = new Matrix4();
    translation.makeTranslation(center.x, center.y, center.z);
    geometry.applyMatrix4(translation);
    geometry.getAttribute('position').needsUpdate = true;
    return translation;
  }

  private alignWithVertice(geometry: BufferGeometry, verticeIndex = 0, normal = new Vector3(1, 0, 0)): Matrix4 {
    const vertices = ThreeUtils.getBufferGeometryVertices(geometry);
    if (!vertices.length || !vertices[verticeIndex]) {
      console.warn('Vertice index not found');
      return;
    }
    const vertice = vertices[verticeIndex];
    const quaternion = new Quaternion();
    quaternion.setFromUnitVectors(vertice, normal);
    const vectorMatrix = new Matrix4();
    vectorMatrix.makeRotationFromQuaternion(quaternion);
    geometry.applyMatrix4(vectorMatrix);
    return vectorMatrix;
  }

}
