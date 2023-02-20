import { NavigationToolNewPathEvent } from './navigation-tool';
import { SelectToolObjectEvent } from './select-tool';
import { IFCJSHelper } from './../../ifcjs-components/ifcjs-helper';
import { SearchToolConfig } from './search-tool';
import { BaseTool } from './base-tool';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { inject, bindable, bindingMode } from 'aurelia-framework';
import { Three } from '../three';
import { SiteManager } from './../site-manager';
import { ThreeObjectModel } from '../../internal';
import { Object3D, Scene, Vector3, Plane } from 'three';
import { ThreeUtils } from '../three-utils';
import { SelectDialog } from './../../components/dialogs/select';


@inject(EventAggregator, Three)
export class ObjectPropertyTool extends BaseTool {

  @bindable({defaultBindingMode: bindingMode.toView}) public siteManager: SiteManager;
  @bindable object: Object3D;

  public navigationStart: Object3D | undefined;
  public navigationEnd: Object3D | undefined;
  public objectsList: Object3D[] = [];
  public editMode: boolean = false;

  private newPropertyLabel: string = "";
  private newPropertyValue: string = "";
  private convertTobuilding: Object3D | undefined = undefined;
  private convertBuilding: Object3D | undefined = undefined;
  private convertBuildingStorey: Object3D | undefined = undefined;
  private convertBuildingName: string = '';
  private convertBuildingStoreyName: string = '';

  constructor(eventAggregator: EventAggregator, private three: Three) {
    super(eventAggregator);
    this.hoverBoxPosition = 'next-toolbar';
  }

  public attached(): void {
    super.attached();
    // this.selectTool.listenToCursor();
    this.listenToSelectTool();
    // this.listenToSearchSelection();
    // this.listenToSpatialStructureSelection();
  }

  public detached(): void {
    super.detached();
  }

  public toggleOpened(): void {
    super.toggleOpened();
    if (this.opened) {
      this.listAllObjects();
    } else {
      this.eventAggregator.publish('aurelia-three:select-tool:select', {object: null});
      console.log('close')
    }
  }

  public listenToSelectTool(): void {
    this.subs.push(this.eventAggregator.subscribe('aurelia-three:select-tool:selected', (data: SelectToolObjectEvent) => {
      if (this.object !== data.object) {
        this.setObject(data.object);
      }
    }));
  }

  public selectObject(uuid: string): void {
    for (const obj of this.siteManager.scene.children) {
      if (obj.uuid == uuid) {
      this.setObject(obj);
      this.editMode = false;
      }
    }
  }

  public removeObject(uuid: string): void {
    for (const obj of this.siteManager.scene.children) {
      if (obj.uuid == uuid) {
        obj.removeFromParent();
      }
    }
  }
  
  public editObject(uuid: string): void {   
    for (const obj of this.siteManager.scene.children) {
      if (obj.uuid == uuid) {
        this.setObject(obj);
        this.editMode = true;
      }
    }
  }

  public listAllObjects(): void {
    if (!this.object) {
      this.objectsList =  this.siteManager.scene.children;
      console.log('objects Three', this.siteManager.scene);
    }
  }

  public notifySelectTool(): void {
    this.eventAggregator.publish('aurelia-three:select-tool:select', {object: this.object});
    this.listAllObjects();
  }

  public setObject(object: Object3D | null): void {
    this.object = object;
    if (this.object) {
      this.notifySelectTool();
    } else {
      this.object = undefined;
      if (this.opened) {
        this.toggleOpened();
      }
      this.notifySelectTool();
    }
  }

  public keys(data: {[key: string]: any}): string[] {
    return data ? Object.keys(data) : [];
  }

  public name(object: Object3D): string {
    return object ? this.siteManager?.getObjectLabel(object) || '' : '';
  }

  public hide(): void {
    this.eventAggregator.publish('aurelia-three:filter-tool:filter-object', this.object);
    this.eventAggregator.publish('aurelia-three:select-tool:select', {});
  }

  public addProperty(uuid: string): void {
    let selectedObject: Object3D;
    for (const obj of this.siteManager.scene.children) {
      if (obj.uuid == uuid) {
        console.log('Add new propertie', this.newPropertyLabel, this.newPropertyValue);
        obj.userData.properties.push(this.newPropertyLabel)
        obj.userData.properties[this.newPropertyLabel] = this.newPropertyValue;
        console.log('Add propertie to object', obj);
        selectedObject = obj;
      }
    }
  }

  public convertGidBuilding(object: Object3D): void {
    if (object) {
      this.convertTobuilding = object;
      this.convertBuilding = undefined;
      this.convertBuildingStorey = undefined;
      this.convertBuildingName = '';
      this.convertBuildingStoreyName = '';
    
    }
  }
  public async convertSave(): Promise<void> {
    if (this.convertTobuilding && this.convertBuilding && this.convertBuildingStorey) {

      let gisMeshBuilding: ThreeObjectModel = await ThreeObjectModel.getOneWithId(this.convertTobuilding.userData.id);
      let gisStorey: ThreeObjectModel = await ThreeObjectModel.getOneWithId(this.convertBuildingStorey.userData.id);
      const buildingName: string = this.convertBuilding?.userData?.properties?.name;

      if (gisMeshBuilding && gisStorey && buildingName) {
        
        // Update Mesh Building : building, parentId
        gisMeshBuilding.building = buildingName;
        gisMeshBuilding.parentId = this.convertBuildingStorey?.userData?.id;
        // update parentId +  childrenIds in parent object
        await gisMeshBuilding.updateProperties('?updateParent=true', ['building', 'parentId']);
        
        
        let gisBuilding: ThreeObjectModel = await ThreeObjectModel.getOneWithId(gisStorey.parentId);
        if (gisBuilding) {
          gisBuilding.building = buildingName;
          await gisBuilding.updateProperties('', ['building']);
        }
      }
      
      // clean
      this.convertTobuilding = undefined;
      this.convertBuilding = undefined;
      this.convertBuildingStorey = undefined;
      this.convertBuildingName = '';
      this.convertBuildingStoreyName = '';
    }
  }

  public async openKeyListBuildings(): Promise<void> {
    const buildings: Object3D[] = this.siteManager.siteObject.children.filter(o => o.userData.properties?.type === 'IFCBUILDING' && o.children.length > 0); 
  
    let options : {value: string, label: string}[] = [];
    for (const building of buildings) {
      options.push({value: building.uuid, label: building.userData.properties.name})
    }
    const response = await SelectDialog.renderModal({title: 'Select a key', options});
    if (!response.wasDismissed) {
      this.convertBuilding = buildings.find(b => b.uuid === response.value);
      this.convertBuildingName = this.convertBuilding?.userData?.properties?.name;
    }
  }
  public async openKeyListBuildingStoreys(): Promise<void> {
    if (this.convertBuilding) {
      const storeys = this.convertBuilding.children.filter(o => o.userData.properties.type === 'IFCBUILDINGSTOREY');
      let options : {value: string, label: string}[] = [];
      for (const storey of storeys) {
        options.push({value: storey.uuid, label: storey.userData.storey})
      }
      const response = await SelectDialog.renderModal({title: 'Select a key', options});
      if (!response.wasDismissed) {
        this.convertBuildingStorey = storeys.find(b => b.uuid === response.value);
        this.convertBuildingStoreyName = this.convertBuildingStorey?.userData?.storey;
      }
    }
  }

  public zoomOnTop(): void {
    const storey = IFCJSHelper.getStoreyObject(this.object);
    if (storey) {
      this.three.navigationControls.zoomOnObject(storey, new Vector3(0, -1, 0), 0.8);  
    } else {
      this.three.navigationControls.zoomOnObject(this.object, new Vector3(0, -1, 0), 6);
    }
  }

  public zoom3D(): void {
    const storey = IFCJSHelper.getStoreyObject(this.object);
    if (storey) {
      this.three.navigationControls.zoomOnObject(storey, new Vector3(-1, -0.5, -1), 0.8);
      const centroid = ThreeUtils.centroidFromObject(this.object);
      this.three.scene.controls.target.copy(centroid);
    } else {
      this.three.navigationControls.zoomOnObject(this.object, new Vector3(-1, -0.5, -1), 6);
    }
  }

  public setAsStart(): void {
    this.navigationStart = this.object;
    this.notifiyNavigationTool();
  }

  public setAsDestination(): void {
    this.navigationEnd = this.object;
    this.notifiyNavigationTool();
  }

  public notifiyNavigationTool(): void {
    if (!this.navigationEnd) {
      return;
    }
    const event: NavigationToolNewPathEvent = {
      from: this.navigationStart,
      to: this.navigationEnd
    };
    this.eventAggregator.publish('aurelia-three:navigation:new-path', event);
  }

}
