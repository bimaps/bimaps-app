import { Scene, Object3D, Light, Camera, GridHelper, Texture, BoxHelper, BufferGeometry } from 'three';
import { Box3, Vector3, Mesh, Line3, EdgesGeometry, MeshBasicMaterial, PlaneGeometry } from 'three';
import { Triangle } from 'three';

export class ThreeUtils {

  public static addInScene(
    obj: Object3D,
    scene: Scene,
    options?: {
      alsoAddLight?: boolean; 
      alsoAddCamera?: boolean;
      alsoAddGrid?: boolean;
    }): void {    

    if (obj.type === 'Scene') {
      while (obj.children.length > 0) {
        let child = obj.children.pop();
        ThreeUtils.addInScene(child, scene, options);
      }
      return;
    } else {
      const isLight = obj instanceof Light;
      const isCamera = obj instanceof Camera;
      const isGrid = obj instanceof GridHelper;
      if (isLight && !options?.alsoAddLight) {
        return;
      }
      if (isCamera && !options?.alsoAddCamera) {
        return;
      }
      if (isGrid && !options?.alsoAddGrid) {
        return;
      }
      scene.add(obj);
    }
  }

  public static clearScene(scene: Scene): void {
    const objects = scene.children;
    for (const obj of objects) {
      const isLight = obj instanceof Light;
      const isCamera = obj instanceof Camera;
      const isGrid = obj instanceof GridHelper;
      if (!isLight && !isCamera && !isGrid) {
        scene.remove(obj);
      }
    }
  }

  public static bboxFromObject(object: Object3D): Box3 {
    let bbox = new BoxHelper(object);
    bbox.geometry.computeBoundingBox();
    return bbox.geometry.boundingBox;
  }

  public static bboxFromObjects(objects: Array<Object3D>): Box3 | null {
    if (!objects || !objects.length) return null;
    let bbox: Box3;
    for (let obj of objects) {
      if (!bbox) {
        bbox = new Box3();
        bbox.setFromObject(obj);
      } else {
        bbox.expandByObject(obj);
      }
    }
    return bbox;
  }
  
  public static isBbox000(bbox: Box3): boolean {
    return bbox.min.x === 0 && bbox.min.y === 0 && bbox.min.z === 0 && bbox.max.x === 0 && bbox.max.y === 0 && bbox.max.z === 0;
  }

  public static centroidFromBbox(bbox: Box3): Vector3 {
    let centroid = new Vector3(0.5 * ( bbox.max.x + bbox.min.x ), 0.5 * ( bbox.max.y + bbox.min.y ), 0.5 * ( bbox.max.z + bbox.min.z ));
    return centroid;
  }

  public static centroidFromObject(object: Object3D): Vector3 {
    let bbox = ThreeUtils.bboxFromObject(object);
    return ThreeUtils.centroidFromBbox(bbox);
  }

  public static centroidFromObjects(objects: Array<Object3D>): Vector3 | null {
    if (objects.length === 0) return null;
    let bbox = ThreeUtils.bboxFromObjects(objects);
    return ThreeUtils.centroidFromBbox(bbox);
  }

  static textureText(text: string, font = '500px Arial', paddingX = 150, paddingY = 80) {
    let canvas = document.createElement('canvas');
    // canvas.css
    let context = canvas.getContext('2d');

    context.font = font;

    let textSize = context.measureText(text);
    //textSize.height = 500;

    canvas.width = textSize.width + (paddingX * 2);
    //canvas.height = textSize.height + (paddingY * 2);

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = '#000';
    context.lineWidth = 100;
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    //context.strokeRect(0, 0, canvas.width, canvas.height);

    context.font = font;

    context.fillStyle = '#000';
    context.fillText(text, paddingX, canvas.height - (paddingY *1.5), textSize.width);

    //context.strokeStyle = 'black';
    //context.strokeText(text, 0, 20);

    // canvas contents will be used for a texture
    var texture = new Texture(canvas)
    texture.needsUpdate = true;

    let geometry = new PlaneGeometry( canvas.width, canvas.height, 1 );
    let material = new MeshBasicMaterial({map: texture, color: 0xffffff});
    //material.combine = THREE.MixOperation;
    material.transparent = true;
    material.needsUpdate = true;
    let plane = new Mesh( geometry, material );

    plane.scale.set(10,10,10);

    return plane;
  }

  public static edgesFromObject(object: Mesh): Line3[] {
    const edges: Line3[] = [];
    const edgesGeom = new EdgesGeometry(object.geometry);
    const vertices: Vector3[] = []
    const arr = edgesGeom.attributes.position.array;
    for (let k = 0; k < arr.length; k += 3) {
      vertices.push(new Vector3(arr[k], arr[k+1], arr[k+2]));
    };
    for (let k = 0; k < vertices.length; k += 2) {
      const start = vertices[k];
      const end = vertices[k+1];
      edges.push(new Line3(start, end));
    }
    return edges;
  }

  static getBufferGeometryVertices(geometry: BufferGeometry): Vector3[] {
    const vertices: THREE.Vector3[] = [];
    if (geometry.index) {

      const indexAttribute = geometry.getIndex();
      const positionAttribute = geometry.getAttribute('position');
      for (let k = 0; k < indexAttribute.array.length; k++) {
        const index = indexAttribute.getX(k);
        vertices.push(new Vector3(
          positionAttribute.getX(index),
          positionAttribute.getY(index),
          positionAttribute.getZ(index),
        ));
      }
    } else {
      for (let index = 0; index < geometry.attributes.position.array.length; index += 3) {
        vertices.push(new Vector3(
          geometry.attributes.position.array[index],
          geometry.attributes.position.array[index + 1],
          geometry.attributes.position.array[index + 2]
        ));
      }
    }
    return vertices;
  }

  static getBufferGeometryFaces(geometry: BufferGeometry): Triangle[] {
    const triangles: Triangle[] = [];
    const vertices = ThreeUtils.getBufferGeometryVertices(geometry);
    for (let index = 0; index < vertices.length; index += 3) {
      triangles.push(new Triangle(
        vertices[index],
        vertices[index + 1],
        vertices[index + 2]
      ));
    }

    return triangles;
  }

  static getBufferGeometryWireframe(geometry: BufferGeometry): Line3[] {
    const edgeIndexPairs: {[key: string]: boolean} = {};
    const edges: Line3[] = [];
    const vertices = ThreeUtils.getBufferGeometryVertices(geometry);
    for (let index = 0; index < vertices.length; index += 3) {

      const A = vertices[index];
      const B = vertices[index + 1];
      const C = vertices[index + 2];
      const indexA = `${A.x}:${A.y}:${A.z}`;
      const indexB = `${B.x}:${B.y}:${B.z}`;
      const indexC = `${C.x}:${C.y}:${C.z}`;
      const indexAB = `${indexA}-${indexB}`;
      const indexBA = `${indexB}-${indexA}`;
      const indexBC = `${indexB}-${indexC}`;
      const indexCB = `${indexC}-${indexB}`;
      const indexAC = `${indexA}-${indexC}`;
      const indexCA = `${indexC}-${indexA}`;

      if (!edgeIndexPairs[indexAB]) {
        edges.push(new Line3(A, B));
        edgeIndexPairs[indexAB] = true;
        edgeIndexPairs[indexBA] = true;
      }

      if (!edgeIndexPairs[indexAC]) {
        edges.push(new Line3(A, C));
        edgeIndexPairs[indexAC] = true;
        edgeIndexPairs[indexCA] = true;
      }

      if (!edgeIndexPairs[indexBC]) {
        edges.push(new Line3(B, C));
        edgeIndexPairs[indexBC] = true;
        edgeIndexPairs[indexCB] = true;
      }
    }
    return edges;
  }

}
