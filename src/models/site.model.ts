import { model, Model, type, jsonify, Metadata } from 'aurelia-deco';
import * as THREE from 'three';
import { Logger, getLogger } from 'aurelia-logging';
import { ThreeMaterialModel, ThreeGeometryModel, ThreeObjectModel, ThreeObjectPrepareFiltersOptions } from '../internal';
const log: Logger = getLogger('three-site-model');

export interface UploadData {
  objectsToRemove?: string[];
  geometriesToRemove?: string[];
  materialsToRemove?: string[];
  objects?: (ThreeObjectModel & {originalObject?: THREE.Object3D})[];
  materials?: ThreeMaterialModel[];
  geometries?: ThreeGeometryModel[];
  objectsToUpdate?: (ThreeObjectModel & {originalObject?: THREE.Object3D})[];
  materialsToUpdate?: ThreeMaterialModel[];
  geometriesToUpdate?: ThreeGeometryModel[];
}

export interface ThreeSiteModelAddJsonDataOptions {
  importId?: string;
  callbackWhenUploadDone?: (result: any) => void;
  ignoreWaitForCompletion?: boolean;
  reportId?: string;
  sendReportToEmail?: string;
};

@model('/three/site')
export class ThreeSiteModel extends Model {

  @type.id
  public id: string;

  @type.string
  public name: string;

  @type.any
  public center: THREE.Vector3;

  @type.any
  public originalCameraPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  @type.float
  public originalCameraZoom: number = 10;
  
  @type.any
  public originalCameraLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  @type.id
  public bcfProjectId?: string;

  @type.any
  public settings: any = {};

  @type.metadata
  public metadata: Array<Metadata>;
  
  @type.string
  public business: string;
  
  @type.array({type: 'string'})
  public authorizedBusinesses: Array<string> = [];

  static clearData(siteId: string, models: Array<string> = [
    'material',
    'geometry',
    'object']) {
    return ThreeSiteModel.api.delete(`/three/site/${siteId}/delete-data`, {models: models}).then(jsonify);
  }

  static clearImport(siteId: string, importId: string) {
    return ThreeSiteModel.api.delete(`/three/site/${siteId}/delete-import`, importId).then(jsonify);
  }

  static downloadJsonData(json: any, filename: string = 'scene.json') {
    let jsonString = JSON.stringify(json);
    let blob = new Blob([jsonString], {type: 'octet/stream'});
    let url = URL.createObjectURL(blob);
    location.href = url;
    let a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  static async addJsonData(siteId: string, json: Blob | any, options?: ThreeSiteModelAddJsonDataOptions): Promise<any> {
    let blob: Blob;
    if (json instanceof Blob) {
      blob = json;
    } else {
      let jsonString = JSON.stringify(json);
      blob = new Blob([jsonString], {type: 'octet/stream'});
    }
    let formData = new FormData;
    formData.append('json', blob);
    let url = `/three/site/${siteId}/import/json?`;
    if (options && options.importId) url += `&importId=${options.importId}`;
    return ThreeSiteModel.api.post(url, formData, {bodyFormat: 'FormData'}).then(jsonify);
  }

  static async uploadData(siteId: string, data: UploadData): Promise<any> {
    const dataString = JSON.stringify(data);
    const blob = new Blob([dataString], {type: 'octet/stream'});
    let formData = new FormData;
    formData.append('data', blob);
    let url = `/three/site/${siteId}/import/data?`;
    return ThreeSiteModel.api.post(url, formData, {bodyFormat: 'FormData'}).then(jsonify);
  }

  static async addIFCData(siteId: string, ifcBlob: Blob, options?: ThreeSiteModelAddJsonDataOptions): Promise<boolean> {
    let blob = ifcBlob;
    let formData = new FormData;
    formData.append('ifc', blob);
    let url = `/three/site/${siteId}/import/ifc?`;
    if (options && options.importId) url += `&importId=${options.importId}`;
    if (options && options.reportId) url += `&reportId=${options.reportId}`;
    if (options && options.sendReportToEmail) url += `&email=${options.sendReportToEmail}`
    const result = await ThreeSiteModel.api.post(url, formData, {bodyFormat: 'FormData'}).then(jsonify);
    if (options && options.callbackWhenUploadDone) {
      options.callbackWhenUploadDone.call(null, result);
    }
    if (options && options.ignoreWaitForCompletion) {
      return true;
    }
    if (result?.status === 'in-progress') {
      return await ThreeSiteModel.waitForOperationCompleted(siteId, result.id);
    }
  }

  static async waitForOperationCompleted(siteId: string, operationId: string): Promise<boolean> {
    const result = await ThreeSiteModel.api.get(`/three/site/${siteId}/import/ifc/${operationId}`).then(jsonify);
    if (result.status === 'completed') {
      return true;
    }
    if (result.status === 'in-progress' || result.message === 'Failed to fetch') {
      return ThreeSiteModel.waitForOperationCompleted(siteId, operationId);
    }
    throw new Error(result.message);
  }

  static getSiteJson(siteId: string, filterObjectsOptions?: ThreeObjectPrepareFiltersOptions): Promise<any> {
    return ThreeSiteModel.getSiteData(siteId, filterObjectsOptions).then((values) => {
      let loadInfos: any = {};
      if (values[0] && values[0][0] && values[0][0].get) loadInfos = values[0][0].get('_loadInfos');
      let json = {
        metadata: {
          version: 4.5,
          type: 'Object',
          generator: 'swissdata',
          loadInfos: loadInfos
        },
        geometries: values[1],
        materials: values[2],
        object: {
          children: values[0].length === 0 ? [] : values[0].map((obj) => {
            if (obj.children === null) delete obj.children;
            return obj
          }),
          layers: 1,
          matrix: [
              1,
              0,
              0,
              0,
              0,
              1,
              0,
              0,
              0,
              0,
              1,
              0,
              0,
              0,
              0,
              1
          ],
          type: 'Scene',
          uuid: siteId
        }
      }
      return json;
    });
  }

  static getSiteData(siteId: string, filterObjectsOptions?: ThreeObjectPrepareFiltersOptions) {
    let promises: Array<Promise<any>> = [];
    let filterObjects = '';
    if (filterObjectsOptions) {
      filterObjects = '&' + ThreeObjectModel.prepareFilters(filterObjectsOptions);
    }
    promises.push(ThreeObjectModel.getAll(`?siteId=${siteId}${filterObjects}`));
    promises.push(ThreeGeometryModel.getAll(`?siteId=${siteId}`));
    promises.push(ThreeMaterialModel.getAll(`?siteId=${siteId}`));
    return Promise.all(promises);
  }

  public static async prepareForUpload(siteId: string, objectsToPrepare: THREE.Object3D[], options?: {ignoreExisting?: boolean}): Promise<UploadData> {

    const objects: (ThreeObjectModel & {originalObject?: THREE.Object3D})[] = [];
    const objectsToUpdate: (ThreeObjectModel & {originalObject?: THREE.Object3D, _properties?: string[]})[] = [];
    const geometries: ThreeGeometryModel[] = [];
    const materials: ThreeMaterialModel[] = [];

    const geometriesUUID: string[] = [];
    const materialsUUID: string[] = [];

    var mongoObjectId = (): string => {
      var timestamp = (new Date().getTime() / 1000 | 0).toString(16);
      return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function() {
          return (Math.random() * 16 | 0).toString(16);
      }).toLowerCase();
    };

    for (const objectToPrepare of objectsToPrepare) {

      objectToPrepare.traverse((object) => {
        const o = object as THREE.Object3D & {_hasBeenUpdated?: string[]};
        if (o._hasBeenUpdated?.length && object.userData.id) {
          const updatedObject: ThreeObjectModel & {originalObject?: THREE.Object3D, _properties?: string[]}  = new ThreeObjectModel();
          updatedObject.id = object.userData.id;
          for (const prop of o._hasBeenUpdated) {
            updatedObject[prop] = o[prop];
          }
          updatedObject._properties = o._hasBeenUpdated;
          updatedObject.originalObject = o;
          objectsToUpdate.push(updatedObject);
          return;
        }
        if (options?.ignoreExisting && object.userData.id) {
          return;
        }
        const jsonObject = object.toJSON();
        const addOrUpdate: 'add' | 'update' = object.userData.id ? 'update' : 'add';
        const newObject: ThreeObjectModel & {originalObject?: THREE.Object3D, isNew?: boolean}  = new ThreeObjectModel();
        newObject.originalObject = object;
        newObject.siteId = siteId;
        newObject.building = object.userData.building;
        newObject.storey = object.userData.storey;
        newObject.space = object.userData.space;
        newObject.uuid = object.uuid;
        newObject.name = object.name;
        newObject.type = object.type;
        newObject.matrix = object.matrix.elements;
        newObject.matrixWorld = object.matrixWorld.elements;
        newObject.layers = jsonObject.layers;
        newObject.visible = object.visible;
        newObject.context = object.userData.context;
        newObject.userData = object.userData;
        newObject.isNew = !object.userData.id;
        newObject.id = object.userData.id ? object.userData.id : mongoObjectId();
        object.userData.id = newObject.id;
        newObject.parentId = object.parent ? object.parent.userData.id : undefined;

        const bbox = new THREE.BoxHelper( object );
        bbox.geometry.computeBoundingBox();
        newObject._min = bbox.geometry.boundingBox.min;
        newObject._max = bbox.geometry.boundingBox.max;

        if (object instanceof THREE.Mesh) {
          const geometry = object.geometry;
          if (!geometriesUUID.includes(geometry.uuid)) {
            geometries.push(ThreeSiteModel.prepareGeometry(siteId, geometry));
            geometriesUUID.push(geometry.uuid);
          }
          newObject.geometry = geometry.uuid;
          const objectMaterials: THREE.Material[] = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of objectMaterials) {
            if (!materialsUUID.includes(material.uuid)) {
              materials.push(ThreeSiteModel.prepareMaterial(siteId, material));
              materialsUUID.push(material.uuid);
            }
          }
          newObject.material = Array.isArray(object.material) ? object.material.map(m => m.uuid) : object.material.uuid;
        }

        if (addOrUpdate === 'add') {
          objects.push(newObject);
        } else {
          objectsToUpdate.push(newObject);
        }
      });

    }

    for (const object of objects) {
      object.childrenIds = object.originalObject.children?.length
        ? object.originalObject.children.map(c => c.userData.id)
        : [];
      delete object.originalObject;
    }
    
    for (const object of objectsToUpdate) {
      if (object._properties.includes('children')) {
        object._properties = object._properties.filter(p => p !== 'children');
        object.childrenIds = object.originalObject.children?.length
        ? object.originalObject.children.map(c => c.userData.id)
        : [];
        object._properties.push('childrenIds');
        
      }
      delete object.originalObject;
    }

    return {
      objects,
      objectsToUpdate,
      geometries,
      materials
    };
  }

  private static prepareGeometry(siteId: string, geometry: THREE.BufferGeometry): ThreeGeometryModel {
    const newGeometry = new ThreeGeometryModel();
    const jsonGeometry = geometry.toJSON();
    newGeometry.data = jsonGeometry.data;
    ThreeSiteModel.roundGeometriesValues(newGeometry);
    newGeometry.siteId = siteId;
    newGeometry.uuid = geometry.uuid;
    newGeometry.type = geometry.type;
    // newGeometry.attributes = geometry.attributes;
    // newGeometry.morphAttributes = geometry.morphAttributes;
    // newGeometry.groups = geometry.groups;
    // newGeometry.drawRange = geometry.drawRange;
    // newGeometry.boundingBox = geometry.boundingBox;
    // newGeometry.boundingSphere = geometry.boundingSphere;
    // newGeometry.index = geometry.index;
    newGeometry.userData = geometry.userData;
    return newGeometry;
  }

  private static roundGeometriesValues(geometry: {data: any}): void {
    if (geometry.data?.attributes?.position) {
      for (let index = 0; index < geometry.data.attributes.position.array.length; index++) {
        geometry.data.attributes.position.array[index] = ThreeSiteModel.roundGeometryValue(geometry.data.attributes.position.array[index]);
      }
    }
    if (geometry.data?.attributes?.normal) {
      for (let index = 0; index < geometry.data.attributes.normal.array.length; index++) {
        geometry.data.attributes.normal.array[index] = ThreeSiteModel.roundGeometryValue(geometry.data.attributes.normal.array[index]);
      }
    }
  }

  private static roundGeometryValue(value: number, roundingFactor = 10000000) {
    value = Math.round(value * roundingFactor) / roundingFactor;
    value = Math.abs(value) > 0.00000000001 ? value : 0;
    return value;
  }

  private static prepareMaterial(siteId: string, material: THREE.Material): ThreeMaterialModel {
    const newMaterial = new ThreeMaterialModel();
    const jsonMaterial = material.toJSON();
    newMaterial.formatVersion = jsonMaterial.formatVersion;
    newMaterial.siteId = siteId;
    newMaterial.uuid = material.uuid;
    newMaterial.type = material.type;
    newMaterial.color = jsonMaterial.color;
    newMaterial.ambient = jsonMaterial.ambient;
    newMaterial.emissive = jsonMaterial.emissive;
    newMaterial.specular = jsonMaterial.specular;
    newMaterial.shininess = jsonMaterial.shininess;
    newMaterial.roughness = jsonMaterial.roughness;
    newMaterial.metalness = jsonMaterial.metalness;
    newMaterial.opacity = jsonMaterial.opacity;
    newMaterial.transparent = jsonMaterial.transparent;
    newMaterial.side = jsonMaterial.side;
    newMaterial.depthFunc = jsonMaterial.depthFunc;
    newMaterial.depthTest = jsonMaterial.depthTest;
    newMaterial.depthWrite = jsonMaterial.depthWrite;
    newMaterial.stencilWrite = jsonMaterial.stencilWrite;
    newMaterial.stencilFunc = jsonMaterial.stencilFunc;
    newMaterial.stencilRef = jsonMaterial.stencilRef;
    newMaterial.stencilMask = jsonMaterial.stencilMask;
    newMaterial.stencilFail = jsonMaterial.stencilFail;
    newMaterial.stencilZFail = jsonMaterial.stencilZFail;
    newMaterial.stencilZPass = jsonMaterial.stencilZPass;
    newMaterial.userData = jsonMaterial.userData;
    
    return newMaterial;
  }

}
