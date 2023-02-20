import { IFCManager } from 'web-ifc-three/IFC/components/IFCManager';
import * as THREE from 'three';
import { IfcTypesMap } from './ifcjs-types';
import { Object3D } from 'three';

export interface IFCStructure<T = number> {
  expressID: number;
  type: T;
  children: IFCStructureElement[]; 
}

type IFCStructureValue<T = any> = null | {
  type: number;
  value: T;
}

interface IFCStructureElement extends IFCStructure {
  CompositionType: IFCStructureValue<string>;
  Description: IFCStructureValue<string>;
  GlobalId: IFCStructureValue<string>;
  LandTitleNumber: IFCStructureValue;
  LongName: IFCStructureValue;
  Name: IFCStructureValue<string>;
  ObjectPlacement: IFCStructureValue<number>;
  ObjectType: IFCStructureValue<string>;
  OwnerHistory: IFCStructureValue<number>;
  RefElevation: IFCStructureValue<number>;
  RefLatitude: [IFCStructureValue<number>, IFCStructureValue<number>, IFCStructureValue<number>, IFCStructureValue<number>];
  RefLongitude: [IFCStructureValue<number>, IFCStructureValue<number>, IFCStructureValue<number>, IFCStructureValue<number>];
  Representation: IFCStructureValue<number>;
  SiteAddress: IFCStructureValue;

  OverallHeight?: IFCStructureValue<number>;
  OverallWidth?: IFCStructureValue<number>;
  PartitioningType?: IFCStructureValue;
  PredefinedType?: IFCStructureValue;
  Tag?: IFCStructureValue<string>;

}

export class IfcjsDecompose extends THREE.EventDispatcher {

  public ifcManager: IFCManager;
  private modelID: number;
  private totalElements: number = 0;
  private nbElementsProcessed: number = 0;

  private onProgress?: (event: ProgressEvent) => void;
  private parsePsets = false;
  private includeSiteObjects = false;
  // private flatten = false;
  // private context: 'gis' | 'bim' = 'gis';

  private siteObject: Object3D;

  public async parseModelID(
    ifcManager: IFCManager,
    modelID: number,
    onProgress?: (event: ProgressEvent) => void,
    parsePsets = false,
    includeSiteObjects = false): Promise<THREE.Mesh | THREE.Group> {
    this.ifcManager = ifcManager;
    this.modelID = modelID;
    this.onProgress = onProgress;
    this.parsePsets = parsePsets;
    this.includeSiteObjects = includeSiteObjects;
    // this.flatten = flatten;
    //this.context = context;
    this.dispatchProgress();
    const structure: IFCStructure<'IFCPROJECT'> = await this.ifcManager.getSpatialStructure(modelID, false);
    await this.computeTotalElements(structure);
    const object = await this.processStructure(structure);
    return object
  }

  public static async hasSiteObjects(ifcManager: IFCManager, modelID: number, structure?: IFCStructure<any>): Promise<boolean> {
    if (!structure) {
      structure = await ifcManager.getSpatialStructure(modelID, false);
    }
    let hasSiteMesh = false;
    if (structure.type === 'IFCPROJECT') {
      for (const element of structure.children || []) {
        const elementHasSiteMesh = await this.hasSiteObjects(ifcManager, modelID, element);
        hasSiteMesh = hasSiteMesh || elementHasSiteMesh;
      }
    } else if (structure.type === 'IFCSITE') {
      const scene = new THREE.Scene();
      const subset = ifcManager.createSubset({
        scene: scene as any,
        modelID: modelID,
        ids: [structure.expressID],
        removePrevious: false
      });

      const object = subset ? new THREE.Mesh(subset.geometry, (subset.material as any)) : new THREE.Group();
      if (subset) {
        ifcManager.removeSubset(modelID, scene as any);
      }
      hasSiteMesh = hasSiteMesh || (object instanceof THREE.Mesh);

      for (const element of structure.children || []) {
        const scene = new THREE.Scene();
        const subset = ifcManager.createSubset({
          scene: scene as any,
          modelID: modelID,
          ids: [element.expressID],
          removePrevious: false
        });
        const object = subset ? new THREE.Mesh(subset.geometry, (subset.material as any)) : new THREE.Group();
        if (subset) {
          ifcManager.removeSubset(modelID, scene as any);
        }
        hasSiteMesh = hasSiteMesh || (object instanceof THREE.Mesh);
      }
    }
    return hasSiteMesh;
  }

  private dispatchProgress(): void {
    if (this.onProgress) {
      const progessEvent = new ProgressEvent('ifcjs-decompose', {total: this.totalElements, loaded: this.nbElementsProcessed});
      this.onProgress(progessEvent);
    }
  }

  private async computeTotalElements(structure: IFCStructure<any>, isRoot = true): Promise<void> {
    if (isRoot) {
      this.totalElements = 0;
      this.nbElementsProcessed = 0;
    }
    this.totalElements += 1;
    for (const element of structure.children || []) {
      await this.computeTotalElements(element, false);
    }
  }

  public async processStructure(structure: IFCStructure<any>): Promise<THREE.Mesh | THREE.Group> {
    let object = await this.generateThreeObject(structure.expressID);

    if (structure.type === 'IFCSITE') {
      this.siteObject = object;

      if (this.siteObject instanceof THREE.Mesh) {
        object = new THREE.Group();
        object.userData = this.siteObject.userData;
        if (this.includeSiteObjects) {
          const mesh = new THREE.Mesh(this.siteObject.geometry, this.siteObject.material);
          object.add(mesh);
          mesh.userData.properties = {
            type: 'IFCPROXYELEMENT'
          };
        }
      }
    }

    for (const element of structure.children || []) {
      const child = await this.processStructure(element);
      if (structure.type === 'IFCSITE' && child instanceof THREE.Mesh && !this.includeSiteObjects) {
        continue;
      }
      if (child) {
        object.add(child);
        // if (this.flatten && this.siteObject && structure.type !== 'IFCPROJECT') {
        //   this.siteObject.add(child);
        // } else {
        // }
      }
    }
    
    this.nbElementsProcessed += 1;
    this.dispatchProgress();
    return object;
  }

  private async generateThreeObject(expressID: number): Promise<THREE.Mesh | THREE.Group> {
    const scene = new THREE.Scene();
    const subset = this.ifcManager.createSubset({
      scene: scene as any,
      modelID: this.modelID,
      ids: [expressID],
      removePrevious: false
    });

    const object = subset ? new THREE.Mesh(subset.geometry, (subset.material as any)) : new THREE.Group();

    await this.retrievePropertiesInUserData(expressID, object);
    if (subset) {
      this.ifcManager.removeSubset(this.modelID, scene as any);
    }

    this.fixUserDataKeys(object);

    return object;
  }

  private async retrievePropertiesInUserData(expressID: number, mesh: THREE.Object3D): Promise<void> {

    mesh.userData.expressID = expressID;
    
    const properties = await this.ifcManager.getItemProperties(this.modelID, expressID, true);
    mesh.userData.properties = {
      expressID: expressID,
      globalId: properties.GlobalId.value,
      name: this.decodeSpecialChars(properties.Name.value || ''),
      type: IfcTypesMap[properties.type],
      objectPlacement: properties.ObjectPlacement?.value,
      objectType: this.decodeSpecialChars(properties.ObjectType?.value || ''),
      overallHeight: properties.OverallHeight?.value,
      overallWidth: properties.OverallWidth?.value,
      predefinedType: properties.PredefinedType?.value || ''
    };

    // mesh.userData.context = ['IFCPROJECT', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSPACE'].includes(mesh.userData.properties.type) ? 'gis' : this.context;

    if (this.parsePsets) {
      const propertySets = await this.ifcManager.getPropertySets(this.modelID, expressID, true);
      const psetData: {[key: string]: any} = {};
      for (const pset of propertySets) {
        const data: any = {};
        const name = this.decodeSpecialChars(pset.Name.value);
        psetData[name] = data;
        data.description = pset.Description?.value || '';
        data.properties = {};
        for (const property of pset.HasProperties || []) {
          const propertyType = IfcTypesMap[property.type];
          const dataProperty: any = {};
          const name = this.decodeSpecialChars(property.Name.value);
          data.properties[name] = dataProperty;
          dataProperty.type = propertyType;
          dataProperty.description = property.Description?.value || '';
          if (propertyType === 'IFCPROPERTYSINGLEVALUE') {
            dataProperty.value = this.decodeSpecialChars(property.NominalValue?.value || undefined);
            dataProperty.valueType = property.NominalValue?.label;
            dataProperty.unit = property.Unit?.value;
          } else if (propertyType === 'IFCPROPERTYTABLEVALUE') {
            console.warn('IFCPROPERTYTABLEVALUE not yet handled by retrievePropertiesInUserData');
          } else if (propertyType === 'IFCPROPERTYBOUNDEDVALUE') {
            console.warn('IFCPROPERTYBOUNDEDVALUE not yet handled by retrievePropertiesInUserData');
          } else if (propertyType === 'IFCPROPERTYENUMERATEDVALUE') {
            console.warn('IFCPROPERTYENUMERATEDVALUE not yet handled by retrievePropertiesInUserData');
          } else if (propertyType === 'IFCPROPERTYLISTVALUE') {
            console.warn('IFCPROPERTYLISTVALUE not yet handled by retrievePropertiesInUserData');
          }
        }
      }
  
      mesh.userData.pset = psetData;
    }

  }

  // https://technical.buildingsmart.org/resources/ifcimplementationguidance/string-encoding/
  // https://stackoverflow.com/a/43431132
  private decodeSpecialChars(value: string | any): string | any {
    if (typeof value !== 'string') {
      return value;
    }
    let decoded = value;
    const expr = /\\X2\\(.*?)\\X0\\/;
    let match = decoded.match(expr);
    while(match) {
      decoded = decoded.replace(match[0], String.fromCharCode(parseInt(match[1], 16)));
      match = decoded.match(expr);
    }
    return decoded;
  }

  private fixUserDataKeys(object: {userData: Data}): void {
    this.fixDataKeys(object.userData);
    
  }

  private fixDataKeys(data: Data): void {
    if (!data) {
      return;
    }
    const keys = Object.keys(data);
    for (const key of keys) {
      if (!data.hasOwnProperty(key)) {
        continue;
      }
      const newKey = this.fixKey(key);
      this.renameObjectKey(data, key, newKey);
    }
    for (const key in data) {
      if (!data.hasOwnProperty(key)) {
        continue;
      }
      const value = data[key];
      if (Array.isArray(value)) {
        // process as array
        for (const subValue of value) {
          this.fixDataKeys(subValue);
        }
      } else if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
        // ignore types that don't have sub-keys to fix
        continue; //
      } else if (value && typeof value === 'object') {
        // fix sub-objects keys
        this.fixDataKeys(value as Data);
      }
    }
  }

  private fixKey(key: string): string {
    return key.replace(/\./g, '_').replace(/''/g, "'");
  }

  private renameObjectKey(object: Data, oldName: string, newName: string): void {
    if (oldName !== newName) {
      Object.defineProperty(object, newName,
          Object.getOwnPropertyDescriptor(object, oldName));
      delete object[oldName];
    }
  }

}

interface Data {
  [key: string]: Data | string | number | boolean | Data[];
}
