import { Loader, FileLoader, ShapePath, Shape, Vector3, Line, Object3D, ExtrudeGeometry, Material, BufferGeometry, BoxGeometry, Mesh, Group, MeshBasicMaterial, LineBasicMaterial, LineDashedMaterial, ColorRepresentation } from 'three';
import {
  GeoJSON,
  Feature, FeatureCollection, Position, GeometryCollection, LineString,
  MultiLineString, MultiPoint, MultiPolygon, Point, Polygon, GeoJsonGeometryTypes,
  GeoJsonTypes, GeometryObject
} from "geojson";

export interface LoadedFeature extends Feature {
  _material?: Material | Material[];
  _geometry?: BufferGeometry;
  _altitude?: number;
  _height?: number;
  userData?: {[key: string]: any};
}

export interface GeoJSONObject3D extends Object3D {
  feature: LoadedFeature;
}

export class GeoJSONLoader extends Loader {

  private data: GeoJSON;
  private group: Group;

  public defaultHeight = 1;
  public defaultPointAltitude = 0;
  public defaultLineAltitude = 0;
  public defaultPolygonAltitude = 0;
  public fixCW = true;
  public defaultFaceMaterial?: Material;
  public defaultFaceMaterialColor: ColorRepresentation = 0xff0000;
  public defaultSideMaterial?: Material;
  public defaultSideMaterialColor: ColorRepresentation = 0xff0000;
  public defaultPointMaterial?: Material;
  public defaultPointMaterialColor: ColorRepresentation = 0xff0000;
  public defaultLineMaterial?: Material;
  public defaultLineMaterialColor: ColorRepresentation = 0xff0000;
  public defaultLineWidth = 1;
  public defaultPointGeometry: BufferGeometry;
  public defaultPointGeometrySize = 0.1;

  public scalingFactor = 1000;

  constructor() {
    super();
    new MeshBasicMaterial()
  }

  public load(
    url: string,
    onLoad: (result: Group) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void
  ): void {

    const loader = new FileLoader(this.manager);
    loader.setPath(this.path);
    // loader.setResponseType('arraybuffer');
    loader.setRequestHeader(this.requestHeader);
    loader.setWithCredentials(this.withCredentials);
    loader.load(
        url,
        async (response) => {
          try {
            if (typeof response !== 'string') {
              throw new Error('GeoJSON files must be loaded as string');
            }
            const json: GeoJSON = JSON.parse(response);
            const result = this.parse(json);
            onLoad(result);
          } catch (e) {
            if (onError) {
              onError(e);
            } else {
              console.error(e);
            }
          }
        },
        onProgress,
        onError
    );
  }

  public async loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<Group> {
    return new Promise<Group>((resolve, reject) => {
      this.load(url, resolve, onProgress, reject);
    });
  }

  public parse(data: GeoJSON): Group {

    const obj = new Mesh();
    obj.geometry

    this.data = data;
    this.validate();
    this.scale();

    const collection: FeatureCollection = this.data as FeatureCollection;
    this.render(collection);
    return this.group;
  }

  private validate(): void {
    if (this.data?.type !== 'FeatureCollection') {
      throw new Error('Only FeatureCollection type can be loaded with GeoJSONLoader');
    }
  }

  private scale(): void {
    const collection: FeatureCollection = this.data as FeatureCollection;
    for (const feature of collection.features) {
      this.scaleFeature(feature);
    }
  }

  private scaleFeature(feature: Feature) {
    if (feature.geometry.type === 'Point') {
      feature.geometry.coordinates = this.scalePoint(feature.geometry.coordinates);
    }
    if (feature.geometry.type === 'MultiPoint') {
      feature.geometry.coordinates = this.scaleRing(feature.geometry.coordinates);
    }
    if (feature.geometry.type === 'LineString') {
      feature.geometry.coordinates = this.scaleRing(feature.geometry.coordinates);
    }
    if (feature.geometry.type === 'MultiLineString') {
      const lines = [];
      for (const line of feature.geometry.coordinates) {
        lines.push(this.scaleRing(line));
      }
      feature.geometry.coordinates = lines;
    }
    if (feature.geometry.type === 'Polygon') {
      const rings = [];
      for (const ring of feature.geometry.coordinates) {
        rings.push(this.scaleRing(ring));
      }
      feature.geometry.coordinates = rings;
    }
    if (feature.geometry.type === 'MultiPolygon') {
      const polygons = [];
      for (const polygon of feature.geometry.coordinates) {
        const rings = [];
        for (const ring of polygon) {
          rings.push(this.scaleRing(ring));
        }
        polygons.push(rings);
      }
      feature.geometry.coordinates = polygons;
    }
    if (feature.geometry.type === 'GeometryCollection') {
      throw new Error('The GeometryCollection geometry is not yet supported')
    }
  }
  
  private scalePoint(point: Position): Position {
    return [point[0] * this.scalingFactor, point[1] * this.scalingFactor];
  }
  
  private scaleRing(ring: Position[]): Position[] {
    const newRing: Position[] = [];
    for (const point of ring) {
      newRing.push(this.scalePoint(point));
    }
    return newRing;
  }


  private render(collection: FeatureCollection) {
    this.group = new Group();
    for (const feature of collection.features) {
      const loadedFeature: LoadedFeature = feature;
      const object = this.featureToObject(feature);
      if (loadedFeature.userData) {
        for (const key in loadedFeature.userData) {
          object.userData[key] = loadedFeature.userData[key];
        }
      }
      const obj: GeoJSONObject3D = (object as GeoJSONObject3D);
      obj.feature = feature;
      this.group.add(obj);
    }
    return this;
  }

  private featureToObject(loadedFeature: LoadedFeature): Object3D | undefined {

    if (loadedFeature.geometry.type === 'Point') {
      if (!loadedFeature._geometry) loadedFeature._geometry = this.getDefaultPointGeometry();
      if (!loadedFeature._material) loadedFeature._material = this.getDefaultPointMaterial();
      if (loadedFeature._altitude === undefined) loadedFeature._altitude = this.defaultPointAltitude;

      const object = new Mesh(loadedFeature._geometry, loadedFeature._material);
      if (loadedFeature.geometry)
      object.position.set(
        loadedFeature.geometry.coordinates[0],
        loadedFeature._altitude,
        loadedFeature.geometry.coordinates[1] * -1,
      );
      //object.rotation.x = Math.PI;
      return object;
    }
    if (loadedFeature.geometry.type === 'MultiPoint') {
      const object = new Group();
      if (!loadedFeature._geometry) loadedFeature._geometry = this.getDefaultPointGeometry();
      if (!loadedFeature._material) loadedFeature._material = this.getDefaultPointMaterial();
      if (loadedFeature._altitude === undefined) loadedFeature._altitude = this.defaultPointAltitude;
      for (const point of loadedFeature.geometry.coordinates) {
        const child = new Mesh(loadedFeature._geometry, loadedFeature._material);
        child.position.set(
          point[0],
          loadedFeature._altitude,
          point[1] * -1,
        );
        object.add(child);
      }
      //object.rotation.x = Math.PI;
      return object;
    }
    if (loadedFeature.geometry.type === 'LineString') {
      if (!loadedFeature._material) loadedFeature._material = this.getDefaultLineMaterial();
      if (loadedFeature._altitude === undefined) loadedFeature._altitude = this.defaultLineAltitude;

      const points: Vector3[] = [];

      for (const point of loadedFeature.geometry.coordinates) {
        points.push(new Vector3(point[0], loadedFeature._altitude * -1, point[1]));
      }

      const geometry = new BufferGeometry().setFromPoints(points);
      const object = new Line(geometry, loadedFeature._material);
      object.rotation.x = Math.PI;
      return object;
    }
    if (loadedFeature.geometry.type === 'MultiLineString') {
      const object = new Group();
      if (!loadedFeature._material) loadedFeature._material = this.getDefaultLineMaterial();
      if (loadedFeature._altitude === undefined) loadedFeature._altitude = this.defaultLineAltitude;
      for (const line of loadedFeature.geometry.coordinates) {
        const points: Vector3[] = [];
        for (const point of line) {
          points.push(new Vector3(point[0], loadedFeature._altitude * -1, point[1]));
        }
        const geometry = new BufferGeometry().setFromPoints(points);
        const child = new Line(geometry, loadedFeature._material);
        object.add(child);
      }
      object.rotation.x = Math.PI;
      return object;
    }
    if (loadedFeature.geometry.type === 'Polygon') {
      if (!loadedFeature._height) loadedFeature._height = this.defaultHeight;
      if (!loadedFeature._material) loadedFeature._material = [this.getDefaultFaceMaterial(), this.getDefaultSideMaterial()];
      if (loadedFeature._altitude === undefined) loadedFeature._altitude = this.defaultPolygonAltitude;
      const object = this.polygonToMesh(loadedFeature.geometry, loadedFeature._height, loadedFeature._material, loadedFeature._altitude);
      return object;
    }
    if (loadedFeature.geometry.type === 'MultiPolygon') {
      const object = new Group();
      if (!loadedFeature._height) loadedFeature._height = this.defaultHeight;
      if (!loadedFeature._material) loadedFeature._material = [this.getDefaultFaceMaterial(), this.getDefaultSideMaterial()];
      if (loadedFeature._altitude === undefined) loadedFeature._altitude = this.defaultPolygonAltitude;
      for (const polygon of loadedFeature.geometry.coordinates) {
        const child = this.polygonToMesh({type: 'Polygon', coordinates: polygon}, loadedFeature._height, loadedFeature._material, loadedFeature._altitude);
        object.add(child);
      }
      return object;
    }
    if (loadedFeature.geometry.type === 'GeometryCollection') {
      console.warn('The GeometryCollection geometry is not yet supported');
      return undefined;
    }
    return undefined;
  }

  private polygonToMesh(polygon: Polygon, height: number, material: Material | Material[], altitude: number): Mesh {
    if (this.fixCW) {
      polygon.coordinates = this.fixPolygonCW(polygon.coordinates);
    }
    const shapes = this.shapesFromPolygonCoordinates(polygon.coordinates);
    
    if (shapes.length > 1) {
      console.warn('Seems that the code below do not properly handle multiple shapes');
    }

    for (const shape of shapes) {
      const geometry = new ExtrudeGeometry( shape, {
        depth: height * 1, // TODO: ensure which property effectively sets the "height" of the extrusion
        bevelEnabled: false
      } );
      const object = new Mesh(geometry, material);
      object.rotation.x = Math.PI / -2;
      object.position.y += altitude;
      return object;
    }

  }

  private getDefaultFaceMaterial(): Material {
    if (this.defaultFaceMaterial instanceof Material) {
      return this.defaultFaceMaterial;
    } else if (this.defaultFaceMaterialColor) {
      return new MeshBasicMaterial({color: this.defaultFaceMaterialColor});
    } else {
      return new MeshBasicMaterial({color: 0xff0000});
    }
  }

  private getDefaultSideMaterial(): Material {
    if (this.defaultSideMaterial instanceof Material) {
      return this.defaultSideMaterial;
    } else if (this.defaultSideMaterialColor) {
      return new MeshBasicMaterial({color: this.defaultSideMaterialColor});
    } else {
      return new MeshBasicMaterial({color: 0xff0000});
    }
  }

  private getDefaultPointMaterial(): Material {
    if (this.defaultPointMaterial instanceof Material) {
      return this.defaultPointMaterial;
    } else if (this.defaultPointMaterialColor) {
      return new MeshBasicMaterial({color: this.defaultPointMaterialColor});
    } else {
      return new MeshBasicMaterial({color: 0xff0000});
    }
  }

  private getDefaultLineMaterial(): Material {
    if (this.defaultLineMaterial instanceof LineBasicMaterial || this.defaultLineMaterial instanceof LineDashedMaterial) {
      return this.defaultLineMaterial;
    } else if (this.defaultLineMaterialColor) {
      return new LineBasicMaterial({color: this.defaultLineMaterialColor, linewidth: this.defaultLineWidth || 1});
    } else {
      return new LineBasicMaterial({color: 0xff0000, linewidth: this.defaultLineWidth || 1});
    }
  }

  private getDefaultPointGeometry(): BufferGeometry {
    if (this.defaultPointGeometry instanceof BufferGeometry) {
      return this.defaultPointGeometry;
    } else if (this.defaultPointGeometrySize) {
      return new BoxGeometry(this.defaultPointGeometrySize, this.defaultPointGeometrySize, this.defaultPointGeometrySize);
    } else {
      return new BoxGeometry(0.1, 0.1, 0.1);
    }
  }

  private shapesFromPolygonCoordinates(coordinates: Position[][]): Shape[] {
    const shapePath = new ShapePath();
    for (const ring of coordinates) {
      let firstPoint = true;
      for (const point of ring) {
        if (firstPoint) {
          shapePath.moveTo(point[0], point[1]);
        } else {
          shapePath.lineTo(point[0], point[1]);
        }
        firstPoint = false;
      }
    }

    const shapes = shapePath.toShapes(true);
    return shapes;
  }

  private fixPolygonCW(coordinates: Position[][]) {
    let isFirst = true;
    for (const ring of coordinates) {
      const isCW = this.isPolygonCW(ring);
      if (isFirst && !isCW) {
        ring.reverse();
      }
      if (!isFirst && isCW) {
        ring.reverse();
      }
      isFirst = false;
    }
    return coordinates;
  }

  //https://stackoverflow.com/a/10298685/437725
  private isPolygonCW(points: Position[]) {
    let signedArea = 0
    for (const index in points) {
      const point1 = points[index];
      let index2: number;
      if (parseInt(index, 10) < points.length - 1) {
        index2 = parseInt(index, 10) + 1;
      } else {
        index2 = 0;
      }
      const point2 = points[index2];
      const x1 = point1[0];
      const y1 = point1[1];
      const x2 = point2[0];
      const y2 = point2[1];
  
      signedArea += (x1 * y2 - x2 * y1);
    }
    signedArea = signedArea / 2;
    if (signedArea > 0) return true;
    return false;
  }

  private pipe(func, options = {}) {
    func.call(this, options);
    return this;
  }

}
