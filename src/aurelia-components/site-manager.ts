import { StylingManager } from './styling/styling-manager';
import { IFCJSHelper } from './../ifcjs-components/ifcjs-helper';
import { ThreeUtils } from './three-utils';

import { ThreeGeometryModel, ThreeMaterialModel, ThreeObjectModel } from '../internal';
import { Scene, Object3D, Group, Mesh, BufferGeometry, Material, LineBasicMaterial, MeshLambertMaterial, Box3, ObjectLoader, Vector3, Plane } from 'three';
import { NavigationControls } from './../controls/navigation-controls';
import { Matrix4 } from 'three';

export class SiteManager {

  public siteId: string; // ObjectId
  public siteObject: Group; 
  public siteIdentifier: string; // globalId from IFC
  private objectByIdentifier: {[key: string]: Mesh | Group} = {};

  public objectQueryLimit = 5000;
  public matGeomQueryLimit = 1500;
  public showMultiLevel: boolean = false;
  private objectLoader = new ObjectLoader();
  private objectIdsRemoved: string[] = [];

  private objectById: {[key: string]: Group | Mesh} = {};
  private materials: {[key: string]: Material} = {};
  private geometries: {[key: string]: BufferGeometry} = {};
  private materialsToRequest: string[] = [];
  private geometriesToRequest: string[] = [];
  private pendingMaterials: string[] = [];
  private pendingGeometries: string[] = [];
  private objectsWaitingForMaterialOrGeometry: ThreeObjectModel[] = [];
  private objectsToProcess: ThreeObjectModel[] = [];
  private bimLoaded: string[] = [];

  private bbox: Box3;

  /**
   * Property to stores UUIDs of objects to ensure they are not
   * missing at the end of the import
   */
  private missingObjectsToCheck: string[] = [];

  public static getIdentifier: (object: {parent?: any, userData: {[key: string]: any}}) => string | undefined = (object) => {
    for (const idProperty of ['name', 'globalId']) {
      const identifier = object.userData?.properties ? object.userData.properties[idProperty] : undefined;
      if (identifier) {
        return identifier;
      }
    }
    return undefined;
  }

  constructor(public scene: Scene, private stylingManager: StylingManager, private navigationControls?: NavigationControls) {

  }


  // private identifiers: string[] = [];
  private objectsByIdentifier: {[key: string]: Object3D[]} = {};
  private verify(object: Object3D, init = true) {
    if (init) {
      // this.identifiers = [];
      this.objectsByIdentifier = {};
      object.traverse(o => {
        const index = this.missingObjectsToCheck.indexOf(o.uuid);
        if (index !== -1) {
          this.missingObjectsToCheck.splice(index, 1);
        }
      });
      if (this.missingObjectsToCheck.length > 0) {
        console.warn('There are ', this.missingObjectsToCheck.length, 'objects that were supposed to be already in the scene but not found at the end of the process', this.missingObjectsToCheck);
        // reseting the array for next import
        this.missingObjectsToCheck = [];
      }
    }

    const identifier = SiteManager.getIdentifier(object);

    if (!this.objectsByIdentifier[identifier]) {
      this.objectsByIdentifier[identifier] = [];
    }
    this.objectsByIdentifier[identifier].push(object);

    for (const child of object.children || []) {
      this.verify(child, false);
    }

    if (init) {
      for (const identifier in this.objectsByIdentifier) {
        const objects = this.objectsByIdentifier[identifier];
        if (objects.length > 1 && identifier !== 'undefined') {
          console.warn(`Identifier "${identifier}" is found several times in the scene:`, objects);
          // for (const object of objects) {
          //   console.warn('Object:', object.userData.properties?.type, object.userData.import, object);
          // }
        }
      }
    }
  }

  public getObjectById(id: string): Group | Mesh | undefined {
    return this.objectById[id];
  }

  private async getAllObjects(suffix: string = '?', idsToIgnore: string[]): Promise<any[]> {
    const apiKey = ThreeObjectModel.api.state.swissdata.publicKey
    suffix += `&apiKey=${apiKey}`;

    const o: any = ThreeObjectModel.api.defaultOptions({
      method: 'put',
      bodyFormat: 'json',
    });

    o.body = JSON.stringify({ignoreIds: idsToIgnore});
    o.method = 'put';

    const response = await ThreeObjectModel.api.http.fetch('/three/object' + suffix, ThreeObjectModel.api.defaultOptions(o));
    const objects = await response.json();
    for (const object of objects) {
      object.userData.id = object.id;
      object.userData.siteId = object.siteId;
      object.userData.parentId = object.parentId;
      object.userData.childrenIds = object.childrenIds;
      object.userData.importId = object.importId;
      object.userData.building = object.building;
      object.userData.storey = object.storey;
      object.userData.space = object.space;
      object.userData.context = object.context;
      object.userData._min = object._min;
      object.userData._max = object._max;
    }
    return objects;
  }

  public async loadGIS(options?: {force?: boolean}): Promise<void> {
    if (this.siteObject && !options?.force) {
      return;
    }

    if (this.siteObject) {
      this.siteObject.removeFromParent();
      this.siteIdentifier = undefined;
    }

    const structureQuery = {"userData.properties.type": {$in: ['IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSPACE']}};
    const structureSuffix = `&context=gis&__global__=<${JSON.stringify(structureQuery)}>`;
    const structure = this.getAllObjects(`?siteId=${this.siteId}${structureSuffix}`, []).then((o) => this.addObjectsToProcess(o));

    const groundQuery = {"userData.properties.type": {$nin: ['IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSPACE']}, "building": {$in: ['', null]}};
    const groundSuffix = `&context=gis&__global__=<${JSON.stringify(groundQuery)}>`;
    const ground = this.getAllObjects(`?siteId=${this.siteId}${groundSuffix}`, []).then((o) => this.addObjectsToProcess(o));

    const buildingsQuery = {"userData.properties.type": {$nin: ['IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSPACE']}, "building": {$nin: ['', null]}};
    const buildingsSuffix = `&context=gis&__global__=<${JSON.stringify(buildingsQuery)}>`;
    const buildings = this.getAllObjects(`?siteId=${this.siteId}${buildingsSuffix}`, []).then((o) => this.addObjectsToProcess(o));

    await structure;
    await ground;
    await buildings;

    this.verify(this.scene);
  }

  public async loadBIM(building: string, storey: string, sliceAbove = true): Promise<void> {

    const bimKey = `${building}::${storey}`;
    if (!this.showMultiLevel || !this.bimLoaded.includes(bimKey)) {
      this.bimLoaded.push(bimKey);
      const buildingQuery = {"storey": ""};
      const buildingSuffix = `&context=bim&building=${building}&__global__=<${JSON.stringify(buildingQuery)}>`;
      const buildingObjects = this.getAllObjects(`?siteId=${this.siteId}${buildingSuffix}`, []).then((o) => this.addObjectsToProcess(o));
  
      const storeyQuery = {"storey": storey};
      const storeySuffix = `&context=bim&building=${building}&__global__=<${JSON.stringify(storeyQuery)}>`;
      const storeyObjects = this.getAllObjects(`?siteId=${this.siteId}${storeySuffix}`, []).then((o) => this.addObjectsToProcess(o));
  
      await buildingObjects;
      await storeyObjects;
    }

     // clean old level objects
     if (building && storey && !this.showMultiLevel){
      await this.removeObjectFromScene('bim', building, storey);
    }

    this.verify(this.scene);

    if (sliceAbove) {
      const buildingObject: Object3D = this.siteObject.children.find(b => b.userData.building === building);
      if (building) {
        const storeyObject = buildingObject.children.find(s => s.userData.storey === storey);
        if (storeyObject) {
          const children = storeyObject.children;
          const spaces = children.filter(o => o.userData.properties?.type === 'IFCSPACE');
          const bbox = ThreeUtils.bboxFromObjects(spaces.length ? spaces : children);
          const min = bbox.min.y;
          const max = min + 1.8; //bbox.max.y;

          this.toggleSliceAbove(true);
          this.updateSliceAboveHeight(building, min, max);
        }
      }
    }
  }

  public async removeObjectFromScene(context: 'gis' | 'bim', buildingName: string,  storeyName: string): Promise<void> {
    const objectsToRemove: Object3D[] = [];
    this.scene.traverse((object) => {
      if (object.userData.context !== context) {
        return;
      }
      if (buildingName == object.userData.building && storeyName == object.userData.storey) {
        return;
      }
      objectsToRemove.push(object);
    });
    for (const object of objectsToRemove) {
      object.removeFromParent();
    }
  }
  
  private slicingAbovePlane: Plane;
  private slicingBelowPlane: Plane;
  private slicingAbove = false;
  public toggleSliceAbove(force?: boolean): void {
    if (this.slicingAbove && force === true) {
      return;
    } else if (!this.slicingAbove && force === false) {
      return;
    }

    this.slicingAbove = force === undefined ? !this.slicingAbove : force;

    if (!this.slicingAbove) {
      this.stylingManager.disposeStyle('slice-above-level');
      this.stylingManager.apply();
      return;
    }

    if (!this.slicingAbovePlane) {
      this.slicingAbovePlane = new Plane(new Vector3(0, -1, 0), 0);
      (this.slicingAbovePlane as any).name = 'site-manager-slice-above-level';
    }
    if (!this.slicingBelowPlane) {
      this.slicingBelowPlane = new Plane(new Vector3(0, -1, 0), 0);
      (this.slicingBelowPlane as any).name = 'site-manager-slice-below-level';
    }
  }

  private updateSliceAboveHeight(building: string, min: number, sliceHeight: number) {
    if (!this.slicingAbovePlane || !this.slicingAbove) {
      return;
    }

    this.slicingAbovePlane.constant = sliceHeight;
    this.slicingBelowPlane.constant = min;
    this.stylingManager.registerStyle('slice-above-level', [
      {
        conditions: [
          {
            key: 'userData.context',
            operator: '=',
            value: 'bim'
          },
          {
            key: 'userData.building',
            operator: '=',
            value: building
          },
        ],
        conditionOperator: 'and',
        applyToChildren: false,
        definitions: [
          {
            visible: true,
            clippingPlanes: [this.slicingAbovePlane]
          }
        ]
      },
      {
        conditions: [
          {
            key: 'userData.context',
            operator: '=',
            value: 'gis'
          },
          {
            key: 'userData.building',
            operator: '=',
            value: building
          },
        ],
        conditionOperator: 'and',
        applyToChildren: false,
        definitions: [
          {
            clippingPlanes: [this.slicingBelowPlane],
          }
        ]
      }
    ], 99, true);
    this.stylingManager.registerStyle('hide-bim', [
      {
        conditions: [
          {
            key: 'userData.context',
            operator: '=',
            value: 'bim'
          }
        ],
        conditionOperator: 'and',
        applyToChildren: false,
        definitions: [
          {
            visible: false
          }
        ]
      }
    ], 95, true);
    this.stylingManager.apply();
  }

  private async addObjectsToProcess(objects: ThreeObjectModel[]): Promise<void> {
    for (const object of objects) {
      this.objectsToProcess.push(object);
    }

    await this.processObjects();
  }

  private async processObjects(): Promise<void> {
    const nbObjectsToProcess = this.objectsToProcess.length;
    const objectsProcessed: ThreeObjectModel[] = [];
    for (const object of this.objectsToProcess) {
      const processed = this.processObject(object);
      if (processed) {
        (object as any)._processed = true;
        objectsProcessed.push(object);
      }
    }
    this.objectsToProcess = this.objectsToProcess.filter(o => !(o as any)._processed);
    const promisesToWaitFor: Promise<void>[] = [];
    if (objectsProcessed.length) {
      promisesToWaitFor.push(this.loadMaterials());
      promisesToWaitFor.push(this.loadGeometries());
    }

    await Promise.all(promisesToWaitFor);

    if (this.objectsToProcess.length !== nbObjectsToProcess && this.objectsToProcess.length > 0) {
      // if we have processed some objects but we still have others
      // we call again the method to process more objects
      console.info('Partially processed', objectsProcessed.length, 'objects, ', this.objectsToProcess.length, 'left to process');
      return this.processObjects();
    } else {
      // completed processing
      console.info('Finished processing', this.objectsToProcess.length, 'objects left to process');
    } 
  }

  private processObject(object: ThreeObjectModel): boolean {
    const parent = this.objectById[object.parentId];
    const isSite = object.userData.properties?.type === 'IFCSITE';
    if (isSite && this.siteObject) {
      return false;
    }
    if (!parent && !isSite) {
      return false;
    }
    if (object.type === 'Group') {
      const group = new Group();
      group.userData = object.userData;
      group.userData.id = object.id;
      const identifier = SiteManager.getIdentifier(group);
      this.objectByIdentifier[identifier] = group;
      this.objectById[object.id] = group;

      if (isSite) {
        this.siteObject = group;
        this.siteIdentifier = identifier;
        this.scene.add(group)
      } else if (parent) {
        parent.add(group);
      }

      return true;
    }
    let hasMaterial = true;
    let hasGeometry = true;
    if (object.material) {
      const materials: string[] = typeof object.material === 'string' ? [object.material] : object.material;
      for (const material of materials) {
        hasMaterial = hasMaterial && !!this.materials[material];
        if (!this.materials[material] && !this.materialsToRequest.includes(material) && !this.pendingMaterials.includes(material)) {
          this.materialsToRequest.push(material);
        }
      }
    }
    if (object.geometry) {
      const geometries: string[] = typeof object.geometry === 'string' ? [object.geometry] : object.geometry;
      for (const geometry of geometries) {
        hasGeometry = hasGeometry && !!this.geometries[geometry];
        if (!this.geometries[geometry] && !this.geometriesToRequest.includes(geometry) && !this.pendingGeometries.includes(geometry)) {
          this.geometriesToRequest.push(geometry);
        }
      }
    }

    this.renderObject(object);
    return true;
  }

  private renderObject(object: ThreeObjectModel) {
    let hasMaterial = true;
    let hasGeometry = true;

    if (object.material) {
      const materials: string[] = typeof object.material === 'string' ? [object.material] : object.material;
      for (const material of materials) {
        hasMaterial = hasMaterial && !!this.materials[material];
      }
    }
    if (object.geometry) {
      const geometries: string[] = typeof object.geometry === 'string' ? [object.geometry] : object.geometry;
      for (const geometry of geometries) {
        hasGeometry = hasGeometry && !!this.geometries[geometry];
      }
    }

    const parent = this.objectById[object.parentId];
    if (hasMaterial && hasGeometry && typeof object.geometry === 'string' && parent) {
      const materials = typeof object.material === 'string' ? this.materials[object.material] : object.material.map(m => this.materials[m]);
      const mesh = new Mesh(this.geometries[object.geometry], materials);
      mesh.userData = object.userData;
      mesh.userData.id = object.id;
      const matrix = new Matrix4();
      matrix.fromArray(object.matrix);
      mesh.position.applyMatrix4(matrix);
      mesh.rotation.setFromRotationMatrix(matrix);
      parent.add(mesh);
      const identifier = SiteManager.getIdentifier(mesh);
      this.objectByIdentifier[identifier] = mesh;
      this.objectById[object.id] = mesh;
    } else {
      this.objectsWaitingForMaterialOrGeometry.push(object);
    }

  }

  private processWaitingObjects(): void {
    const objectsToProcess = this.objectsWaitingForMaterialOrGeometry.splice(0, this.objectsWaitingForMaterialOrGeometry.length);
    for (const object of objectsToProcess) {
      this.renderObject(object);
    }
  }

  private async loadMaterials(): Promise<void> {
    const materialsToRequestNow = this.materialsToRequest.splice(0, this.matGeomQueryLimit);
    if (this.materialsToRequest.length > 0) {
      this.loadMaterials();
    }
    // FIXED Load all materials : const materials = await ThreeMaterialModel.getAll(`?siteId=${this.siteId}&uuid=${materialsToRequestNow.join(',')}`);
    const materials = await ThreeMaterialModel.getAll(`?siteId=${this.siteId}`);
    for (const materialData of materials) {
      if (materialData.type === 'LineBasicMaterial') {
        const material = new LineBasicMaterial(this.prepareMaterialData(materialData));
        this.materials[materialData.uuid] = material;
      } else if (materialData.type === 'MeshLambertMaterial') {
        const material = new MeshLambertMaterial(this.prepareMaterialData(materialData));
        this.materials[materialData.uuid] = material;
      } else {
        console.warn('Material type not yet supported', materialData.type);
      }
    }
    this.processWaitingObjects();
  }

  private prepareMaterialData(materialData: ThreeMaterialModel): {[key: string]: any} {
    const keys = [
      'formatVersion',
      'uuid',
      'name',
      'type',
      'color',
      'ambient',
      'emissive',
      'specular',
      'shininess',
      'roughness',
      'metalness',
      'opacity',
      'transparent',
      'side',
      'depthFunc',
      'depthTest',
      'depthWrite',
      'userData',
    ];
    let data: {[key: string]: any} = {};
    for (const key of keys) {
      if (materialData[key]) {
        data[key] = materialData[key];
      }
    }
    return data;
  }

  private async loadGeometries(): Promise<void> {
    const geometriesToRequestNow = this.geometriesToRequest.splice(0, this.matGeomQueryLimit);
    if (this.geometriesToRequest.length > 0) {
      this.loadGeometries();
    }
    const apiKey = ThreeGeometryModel.api.state.swissdata.publicKey
    const suffix = `?siteId=${this.siteId}&apiKey=${apiKey}`;
    // const geometries = await ThreeGeometryModel.getAll(suffix, {headers: {uuids: geometriesUUIDs.join(',')}});

    const o: any = ThreeGeometryModel.api.defaultOptions({
      method: 'put',
      bodyFormat: 'json',
    });

    o.body = JSON.stringify({uuid: geometriesToRequestNow});
    o.method = 'put';

    const response = await ThreeGeometryModel.api.http.fetch('/three/geometry' + suffix, ThreeGeometryModel.api.defaultOptions(o));
    const geometries = await response.json();
    const json = {
      metadata: {
        version: 4.5,
        type: 'Object'
      },
      geometries: geometries,
      object: {
        type: 'Group',
        children: geometries.map(g => {
          return {
            type: 'Mesh',
            geometry: g.uuid
          }
        })
      }
    };

    const group = await this.objectLoader.parseAsync(json) as Group;
    for (const mesh of group.children) {
      if (mesh instanceof Mesh && mesh.geometry instanceof BufferGeometry) {
        this.geometries[mesh.geometry.uuid] = mesh.geometry;
      }
    }
    this.processWaitingObjects();
  }

  public async pruneObjectsFromFile(filename: string, context: 'gis' | 'bim', ifcTypesToKeep: string[] | 'auto'): Promise<void> {
    if (ifcTypesToKeep === 'auto') {
      ifcTypesToKeep = context === 'gis' ? ['IFCPROJECT', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY'] : [];
    }
    if (!this.siteObject) {
      return;
    }

    // FIRST, prune from the scene
    const objectsToRemove: Object3D[] = [];
    this.siteObject.traverse((object) => {
      const type = object.userData.properties?.type;
      if (ifcTypesToKeep.includes(type)) {
        return;
      }
      const context = object.userData.context;
      if (context !== 'gis') {
        return;
      }
      const file = object.userData.import?.originalFile;
      if (file !== filename) {
        return;
      }
      objectsToRemove.push(object);
    });
    for (const object of objectsToRemove) {
      object.removeFromParent();
      this.addObjectAsObjectIdRemoved(object);
    }

    // SECOND, prune from the scene
    const query: any = {
      "userData.import.originalFile": filename
    };
    if (ifcTypesToKeep.length) {
      query["userData.properties.type"] = {$nin: ifcTypesToKeep}
    }
    const suffix = `&context=${context}&__global__=<${JSON.stringify(query)}>`;
    const objects = await ThreeObjectModel.getAll(`?siteId=${this.siteId}&nocache=1&${suffix}`);
    for (const object of objects) {
      this.addObjectAsObjectIdRemoved(object);
    }
  }

  private addObjectAsObjectIdRemoved(object: {userData: {id?: string}}): void {
    // first we remove the object from the list of known objects in the manager
    const identifier = SiteManager.getIdentifier(object);
    this.objectByIdentifier[identifier] = undefined;
    const id = object.userData.id;
    if (id && !this.objectIdsRemoved.includes(id)) {
      this.objectIdsRemoved.push(id);
    }
  }

  public getObjectIdsRemoved(): string[] {
    return this.objectIdsRemoved;
  }

  public resetObjectIdsRemoved(): void {
    this.objectIdsRemoved = [];
  }

  private markAsUpdated(object: Object3D & {_hasBeenUpdated?: string[]}, properties: string[]) {
    if (!object._hasBeenUpdated) {
      object._hasBeenUpdated = [];
    }
    for (const prop of properties) {
      if (!object._hasBeenUpdated.includes(prop)) {
        object._hasBeenUpdated.push(prop);
      }
    }
  }

  public resetMarkAsUpdated(): void {
    this.siteObject.traverse(o => (o as any)._hasBeenUpdated = undefined);
  }

  public async loadFromIFCExtract(object: Object3D, ifFound: 'ignore' | 'replace' | 'replace-except-site' = 'ignore', context: 'gis' | 'bim' = 'gis', flatten = false): Promise<void> {
    // Remove the object from the scene if it's loaded
    // as this method will merge each object individually if necessary
    this.scene.remove(object);
    const type = object.userData?.properties?.type;
    object.userData.context = ['IFCPROJECT', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY'].includes(type) ? 'gis' : context;
    const identifier = SiteManager.getIdentifier(object);

    // we need to keep a new ref of the children
    // as the value from the object can be manipulated
    // below
    const children = [].concat(...object.children);
    if (type === 'IFCPROJECT') {
      // ignore project
      // TODO: check whether we should keep some of the properties available, and/or transfer to the site properties
    } else if (type === 'IFCSITE' && object instanceof Group) {
      // about site, the goal is to set the .siteIdentifier and .siteObject properties
      // of the manager instance
      // also, we ensure that we only have one instance of this site in the scene
      let site: Group | null = null;
      for (const child of this.scene.children) {
        const childIdentifier = SiteManager.getIdentifier(child);
        if (childIdentifier === identifier && child instanceof Group) {
          // we replace the site only if replaceIsFound is strictly true (avoiding 'except-site')
          if (ifFound === 'replace') {
            this.scene.remove(child);
            this.addObjectAsObjectIdRemoved(child);
            this.scene.add(object);
            site = object;
          } else {
            site = child;
          }
          break;
        }
      }
      if (!site) {
        this.scene.add(object);
        site = object;
      }
      this.siteObject = site;
      this.siteIdentifier = SiteManager.getIdentifier(site);
      this.objectByIdentifier[identifier] = site;
    } else if (object instanceof Group || object instanceof Mesh) {
      // merging the object
      const alreadyIncludedObject = this.objectByIdentifier[identifier];
      const parentIdentifier = SiteManager.getIdentifier(object.parent);
      object.userData.building = SiteManager.getBuildingName(object);
      object.userData.storey = SiteManager.getStoreyName(object);
      object.userData.space = SiteManager.getSpaceName(object);
      const alreadyIncludedParent = this.objectByIdentifier[parentIdentifier];
      if (alreadyIncludedObject && ifFound === 'ignore') {
        // ignore
        // the children will be processed in the next recursive call
      } else if (alreadyIncludedObject && (ifFound === 'replace' || ifFound === 'replace-except-site')) {
        // replace
        alreadyIncludedObject.removeFromParent();
        // keep the children when replacing
        const childrenIdentifiersInNewObject = object.children.map(c => SiteManager.getIdentifier(c));
        const alreadyIncludedChildren = [].concat(...alreadyIncludedObject.children);
        for (const child of alreadyIncludedChildren) {
          const childIdentifier = SiteManager.getIdentifier(child);
          if (!childrenIdentifiersInNewObject.includes(childIdentifier)) {
            child.removeFromParent();
            object.add(child);
          }
        }
        // remove the previous object from the scene and mark it as "to be removed" from API if necessary
        object.removeFromParent();
        this.addObjectAsObjectIdRemoved(alreadyIncludedObject);
        if (flatten) {
          object.userData.building = '';
          object.userData.storey = '';
          object.userData.space = '';
          this.siteObject.add(object);
          this.markAsUpdated(this.siteObject, ['children']);
        } else {
          alreadyIncludedParent.add(object);
          this.markAsUpdated(alreadyIncludedParent, ['children']);
        }
        this.objectByIdentifier[identifier] = object;
      } else {
        // add
        if (alreadyIncludedParent || flatten) {
          if (alreadyIncludedParent) {
            this.markAsUpdated(alreadyIncludedParent, ['children']);
          }
          if (alreadyIncludedParent !== object.parent || (flatten && alreadyIncludedParent !== this.siteObject)) {
            object.removeFromParent();
            if (flatten) {
              object.userData.building = '';
              object.userData.storey = '';
              object.userData.space = '';
              this.siteObject.add(object);
            } else {
              alreadyIncludedParent.add(object);
            }
          } else {
            // the object is already correctly included in its parent
            // we store its uuid for the verify step, to ensure the object
            // is properly included in the scene at the end
            this.missingObjectsToCheck.push(object.uuid);
          }
          this.objectByIdentifier[identifier] = object;
        } else {
          console.warn('Could not find the already included parent for object', object);
        }
      }
    }

    if (['IFCPROJECT', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSPACE'].includes(type)) {
      for (const child of children || []) {
        this.loadFromIFCExtract(child, ifFound, context, flatten);
      }
    } else if (object.children.length > 0) {
      const building = object.userData.building;
      const storey = object.userData.storey;
      const space = object.userData.space;
      const context = object.userData.context;
      object.traverse((o) => {
        o.userData.building = building;
        o.userData.storey = storey;
        o.userData.space = space;
        o.userData.context = context;
      });
    }

    if (type === 'IFCPROJECT') {
      this.verify(this.scene);
      console.info('Final scene', this.scene);
    }
  }

  public static getBuildingName(object: Object3D, ifEmpty = 'Building'): string | undefined {
    const buildingObject = object.userData.properties?.type === 'IFCBUILDING' ? object : IFCJSHelper.getBuildingObject(object);
    return buildingObject ? buildingObject.userData.properties?.name || ifEmpty : undefined;
  }

  public static getStoreyName(object: Object3D, ifEmpty = ''): string | undefined {
    const storeyObject = object.userData.properties?.type === 'IFCBUILDINGSTOREY' ? object : IFCJSHelper.getStoreyObject(object);
    return storeyObject ? storeyObject.userData.properties?.name || ifEmpty : undefined;
  }

  public static getSpaceName(object: Object3D, ifEmpty = ''): string | undefined {
    const spaceObject = object.userData.properties?.type === 'IFCSPACE' ? object : IFCJSHelper.getSpaceObject(object);
    return spaceObject ? spaceObject.userData.properties?.name || ifEmpty : undefined;
  }

  public dispose(): void {
    this.scene.remove(this.siteObject);
    this.siteObject = undefined;
    this.objectByIdentifier = {};
    this.objectById = {};
    this.materials = {};
    this.geometries = {};
    this.materialsToRequest = [];
    this.geometriesToRequest = [];
    this.pendingMaterials = [];
    this.pendingGeometries = [];
    this.objectsWaitingForMaterialOrGeometry = [];
    this.objectsToProcess = [];
    this.bimLoaded = [];
    this.toggleSliceAbove(false);
  }
  
  public getObjectLabel(object: Object3D): string {
    const type = object.userData?.properties?.type;
    if (type === 'IFCBUILDINGELEMENTPROXY') {
      const isCollaborator = object.userData.properties?.objectType.includes('PCO_Collaborateur');
      if (isCollaborator) {
        return `${object.userData.pset["Données"]?.properties["Firstname"]?.value} ${object.userData.pset["Données"]?.properties["Lastname"]?.value}`;
      }
    }
    if (object.userData.properties?.name) {
      return object.userData.properties.name;
    } else if (object.name) {
      return object.name;
    } else if (object.type) {
      return object.type;
    }
    const centroid = ThreeUtils.centroidFromObject(object);
    return `${Math.round(centroid.x * 100) / 100},${Math.round(centroid.y * 100) / 100},${Math.round(centroid.z * 100) / 100}`;
  }

  private findEligibleBuildingsFromPosition(position: Vector3): Object3D[] {
    const buildings = this.siteObject.children.filter(o => o.userData.properties?.type === 'IFCBUILDING') || [];
    const eligibleBuildings = buildings.filter((building) => {
      // determine if x,z min/max are appropriate
      return building.userData._min.x <= position.x
              && building.userData._max.x >= position.x
              && building.userData._min.z <= position.z
              && building.userData._max.z >= position.z
    });
    return eligibleBuildings;
  }

  public findEligibleStoreysFromPosition(position: Vector3, useSpaceDataIfPossible = false): Object3D[] {
    const eligibleBuildings = this.findEligibleBuildingsFromPosition(position);

    const storeys: Object3D[] = eligibleBuildings.reduce((storeys, building) => {
      const buildingStoreys = building.children.filter(o => o.userData.properties?.type === 'IFCBUILDINGSTOREY');
      storeys.push(...buildingStoreys);
      return storeys;
    }, []);

    const eligibleStoreys = storeys.filter((storey) => {
      if (!storey.userData._spaceMinY && useSpaceDataIfPossible) {
        // compute _spaceMin and _spaceMax
        const spaces = IFCJSHelper.getStoreySpaces(storey);
        if (spaces.length) {
          storey.userData._spaceMinY = Math.min(...spaces.map(s => s.userData._min.y));
          storey.userData._spaceMaxY = Math.max(...spaces.map(s => s.userData._max.y));
        }
      }

      // if we could get the space and have some data we use it, otherwise we use the main data from the _max
      const minY = useSpaceDataIfPossible && storey.userData._spaceMinY ? storey.userData._spaceMinY : storey.userData._min.y;
      const maxY = useSpaceDataIfPossible && storey.userData._spaceMaxY ? storey.userData._spaceMaxY : storey.userData._max.y;

      if (maxY < position.y || minY > position.y) {
        return false;
      }
      return storey.userData._min.x <= position.x
        && storey.userData._max.x >= position.x
        && storey.userData._min.z <= position.z
        && storey.userData._max.z >= position.z
    });

    return eligibleStoreys;
  }

  public findStoreyFromPosition(position: Vector3): Object3D | undefined {
    const eligibleStoreys = this.findEligibleStoreysFromPosition(position, true);

    if (eligibleStoreys.length === 1) {
      return eligibleStoreys[0];
    } else if (eligibleStoreys.length === 0) {
      return undefined;
    } else {
      // console.warn('Found several eligible storeys', eligibleStoreys, 'returning the first one');
      return eligibleStoreys.sort((sa, sb) => {
        if (sa.userData._min.y < sb.userData._min.y) {
          return -1;
        } else if (sa.userData._min.y > sb.userData._min.y) {
          return 1;
        }
        return 0;
      })[0];
    }
  }

}
