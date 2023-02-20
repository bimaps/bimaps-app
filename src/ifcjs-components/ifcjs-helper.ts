import { Object3D, BoxHelper } from 'three';
export class IFCJSHelper {

  public static getSiteObject(object: Object3D): Object3D | undefined {
    const type = IFCJSHelper.getType(object);
    let result: Object3D[] | undefined = undefined;
    if (!type || type.indexOf('IFC') !== 0) {
      result = undefined;
    } else if (type === 'IFCPROJECT') {
      const sites = object.children.filter(c => IFCJSHelper.getType(c) === 'IFCSITE');
      if (sites.length === 1) {
        return IFCJSHelper.getSiteObject(sites[0]);
      }
    } else if (type === 'IFCSITE') {
      return object;
    } else if (!object.parent) {
      result = undefined;
    } else {
      return IFCJSHelper.getSiteObject(object.parent);
    }
  }

  public static getBuildingsObjects(object: Object3D): Object3D[] | undefined {
    const type = IFCJSHelper.getType(object);
    let result: Object3D[] | undefined = undefined;
    if (!type || type.indexOf('IFC') !== 0) {
      result = undefined;
    } else if (type === 'IFCPROJECT') {
      const sites = object.children.filter(c => IFCJSHelper.getType(c) === 'IFCSITE');
      if (sites.length === 1) {
        return IFCJSHelper.getBuildingsObjects(sites[0]);
      }
    } else if (type === 'IFCSITE') {
      return object.children.filter(c => IFCJSHelper.getType(c) === 'IFCBUILDING');
    } else if (!object.parent) {
      result = undefined;
    } else {
      return IFCJSHelper.getBuildingsObjects(object.parent);
    }
  }

  public static getStoreysObjects(object: Object3D, options?: {orderByAltitude?: boolean, orderByAltitudeDirection: 'DESC' | 'ASC'}): Object3D[] | undefined {
    const type = IFCJSHelper.getType(object);
    let result: Object3D[] | undefined = undefined;
    if (!type || type.indexOf('IFC') !== 0) {
      result = undefined;
    } else if (type === 'IFCPROJECT') {
      const projects = object.children.filter(c => IFCJSHelper.getType(c) === 'IFCPROJECT');
      if (projects.length === 1) {
        return IFCJSHelper.getStoreysObjects(projects[0], options);
      }
    } else if (type === 'IFCSITE') {
      const buildings = object.children.filter(c => IFCJSHelper.getType(c) === 'IFCBUILDING');
      if (buildings.length === 1) {
        return IFCJSHelper.getStoreysObjects(buildings[0], options);
      }
    } else if (type === 'IFCBUILDING') {
      result = object.children.filter(c => IFCJSHelper.getType(c) === 'IFCBUILDINGSTOREY');
    } else if (!object.parent) {
      result = undefined;
    } else {
      return IFCJSHelper.getStoreysObjects(object.parent, options);
    }

    if (Array.isArray(result) && options?.orderByAltitude !== false) {
      IFCJSHelper.orderByAltitude(result, options?.orderByAltitudeDirection);
    }

    return result;
  }

  public static orderByAltitude(objects: Object3D[], direction?: 'ASC' | 'DESC'): Object3D[] {
    const directionValue = direction === 'DESC' ? -1 : 1;
    objects.sort((a, b) => {

      const bboxHelperA = new BoxHelper(a);
      bboxHelperA.geometry.computeBoundingBox();
      const minYA = bboxHelperA.geometry.boundingBox!.min.y;

      const bboxHelperB = new BoxHelper(b);
      bboxHelperB.geometry.computeBoundingBox();
      const minYB = bboxHelperB.geometry.boundingBox!.min.y;

      if (minYA < minYB) {
        return directionValue * -1;
      } else if (minYA > minYB) {
        return directionValue;
      }
      return 0;
    });
    return objects;
  }

  public static getSpaceObject(object: Object3D): Object3D | undefined {
    const type = IFCJSHelper.getType(object);
    if (!type || type.indexOf('IFC') !== 0 || type === 'IFCSITE' || type === 'IFCPROJECT' || type === 'IFCBUILDING' || type === 'IFCBUILDINGSTOREY') {
      return undefined;
    } else if (type === 'IFCSPACE') {
      return object;
    } else if (!object.parent) {
      return undefined;
    } else {
      return IFCJSHelper.getSpaceObject(object.parent);
    }
  }

  public static getStoreyObject(object: Object3D): Object3D | undefined {
    const type = IFCJSHelper.getType(object);
    if (!type || type.indexOf('IFC') !== 0 || type === 'IFCSITE' || type === 'IFCPROJECT' || type === 'IFCBUILDING') {
      return undefined;
    } else if (type === 'IFCBUILDINGSTOREY') {
      return object;
    } else if (!object.parent) {
      return undefined;
    } else {
      return IFCJSHelper.getStoreyObject(object.parent);
    }
  }

  public static getBuildingObject(object: Object3D): Object3D | undefined {
    const type = IFCJSHelper.getType(object);
    if (!type || type.indexOf('IFC') !== 0 || type === 'IFCSITE' || type === 'IFCPROJECT') {
      return undefined;
    } else if (type === 'IFCBUILDING') {
      return object;
    } else if (!object.parent) {
      return undefined;
    } else {
      return IFCJSHelper.getBuildingObject(object.parent);
    }
  }

  public static getStoreySpaces(object: Object3D): Object3D[] {
    const type = IFCJSHelper.getType(object);
    if (type !== 'IFCBUILDINGSTOREY') {
      return [];
    }
    return object.children.filter(o => IFCJSHelper.getType(o) === 'IFCSPACE');
  }

  public static getType(object: Object3D): string | undefined {
    return object?.userData?.properties?.type;
  }

}
