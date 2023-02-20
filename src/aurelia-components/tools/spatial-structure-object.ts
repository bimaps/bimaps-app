import { SpatialStructureTool } from './spatial-structure-tool';
import { bindable, computedFrom, inject } from 'aurelia-framework';
import { Object3D } from 'three';
import { EventAggregator } from 'aurelia-event-aggregator';
import { Three } from '../three';

@inject(EventAggregator, SpatialStructureTool, Three)
export class SpatialStructureObject {
  
  @bindable object: Object3D;

  public static autoOpened = ['IFCSITE', 'IFCBUILDING'];
  public static structureTypes = ['IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSPACE'];
  public opened: boolean;

  public constructor(private eventAggregator: EventAggregator, private spatialStructureTool: SpatialStructureTool, private three: Three) {
    
  }

  public get isAutoOpened(): boolean {
    const type = this.object.userData.properties?.type;
    return SpatialStructureObject.autoOpened.includes(type);
  }

  public get isStructureType(): boolean {
    const type = this.object.userData.properties?.type;
    return SpatialStructureObject.structureTypes.includes(type);
  }

  public isObjectStructureType(object: Object3D): boolean {
    const type = object.userData.properties?.type;
    return SpatialStructureObject.structureTypes.includes(type);
  }

  public hasStructureTypeChildren(children?: Object3D[]): boolean {
    return children && children.find((c: Object3D) => this.isObjectStructureType(c)) !== undefined;
  }

  @computedFrom('opened')
  public get isOpened(): boolean {
    if (typeof this.opened !== 'boolean') {
      this.opened = this.isAutoOpened;
    }
    return this.opened;
  }

  public toggle(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.opened = !this.opened;
  }

  public clickItem(): void {
    this.dispatchClickObject(this.object);
  }

  public dispatchClickObject(object: Object3D): void {
    this.eventAggregator.publish('aurelia-three:spatial-structure-tool:clicked-object', {
      object, 
      siteManager: this.spatialStructureTool.siteManager, 
      scene: this.three.scene.scene
    });
  }

  
}
