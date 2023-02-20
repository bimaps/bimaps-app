import { SitesTool } from './sites-tool';
import { SelectToolObjectEvent } from './select-tool';
import { IFCJSHelper } from './../../ifcjs-components/ifcjs-helper';
import { CursorControls } from './../../controls/cursor-controls';
import { BaseTool } from './base-tool';
import { EventAggregator } from 'aurelia-event-aggregator';
import { inject, bindable, bindingMode, computedFrom } from 'aurelia-framework';
import { Three } from '../three';
import { SiteManager } from './../site-manager';
import { Object3D } from 'three';
import { Orientation } from './../../controls/navigation-controls';
import { Subscription } from 'aurelia-event-aggregator';

@inject(EventAggregator, Three)
export class SiteNavigatorTool extends BaseTool {

  @bindable({defaultBindingMode: bindingMode.toView}) public siteManager: SiteManager;
  @bindable public sitesTool: SitesTool;
  private selectedBuilding?: Object3D;
  private selectedLevel?: Object3D;
  private selectedObject?: Object3D;

  private subscriptions: Subscription[] = [];

  constructor(eventAggregator: EventAggregator, private three: Three) {
    super(eventAggregator);
    this.hoverBoxPosition = 'next-toolbar';
  }

  public attached(): void {
    super.attached();
    this.handleBuildingClick();
    this.subscriptions.push(this.eventAggregator.subscribe('aurelia-three:select-tool:selected', (data: SelectToolObjectEvent) => {
      if (data.object) {
        const storeyObject = IFCJSHelper.getStoreyObject(data.object);
        if (storeyObject) {
          this.selectLevel(storeyObject);
        }
      } else {
        this.unselectBuilding();
      }
    }));

    this.subscriptions.push(this.eventAggregator.subscribe('aurelia-three:navigation-tool:update-storey', (data: {storey: Object3D}) => {
      if (data.storey) {
        this.selectLevel(data.storey);
      } else {
        this.unselectBuilding();
      }
    }));
  }

  public detached(): void {
    for (const sub of this.subscriptions) {
      sub.dispose();
    }
  }

  private handleBuildingClick(): void {
    this.three.cursorControls.addEventListener('objects-intersects', async (data: {type: 'objects-intersects', target: CursorControls, gestureType: 'down' | 'up' | 'move', objectsIntersects: THREE.Intersection[]}) => {
      
      // Collaborator click
      if (this.selectedBuilding && data.objectsIntersects[0]?.object?.userData?.context === 'bim' && data.objectsIntersects[0].object.userData?.pset?.Autre?.properties?.Type?.value === "Collaborateur") {
        if (data.gestureType === 'down') {
          if (!this.selectedObject || this.selectedObject.uuid != data.objectsIntersects[0].object.uuid) {
            this.selectedObject =  data.objectsIntersects[0].object;
            this.eventAggregator.publish('aurelia-three:select-tool:select', {object: this.selectedObject});
          } else {
            this.eventAggregator.publish('aurelia-three:select-tool:select', {object: null});
          }
        } else if (data.gestureType === 'move') {
          this.three.canvas.classList.add('site-navigator-tool-hoverable');
          return;
        }
      }
      
      // Building check
      if (this.selectedBuilding || data.objectsIntersects.length === 0) {
        this.three.canvas.classList.remove('site-navigator-tool-hoverable');
        return;
      }
      const firstObject = data.objectsIntersects[0].object;
      if (firstObject.userData.building && firstObject.userData.context === 'gis') {
        const building = IFCJSHelper.getBuildingObject(firstObject);
        if (this.buildings.includes(building)) {
          if (data.gestureType === 'down') {
            this.selectBuilding(building);
          } else if (data.gestureType === 'move') {
            this.three.canvas.classList.add('site-navigator-tool-hoverable');
            return;
          }
        }
      }
      this.three.canvas.classList.remove('site-navigator-tool-hoverable');
    });
  }

  @computedFrom('siteManager.siteObject.children.length')
  public get buildings(): Object3D[] {
    if (!this.siteManager?.siteObject) {
      return [];
    }
    const buildings = this.siteManager.siteObject.children.filter(o => o.userData.properties?.type === 'IFCBUILDING' && o.children.length > 0);
    return buildings;
  }

  public selectBuilding(building: Object3D, zoom: 'none' | '3d' | 'top' = '3d'): void {
    if (this.selectedBuilding === building) {
      return;
    }
    if (building?.userData?.properties?.type === 'IFCBUILDING') {
      // here we must handle the download and display of building storey
      this.selectedBuilding = building;
      const storeys = building.children.filter(o => o.userData.properties.type === 'IFCBUILDINGSTOREY');
      const settings = this.sitesTool?.getSelectedSite()?.settings || {};
      const defaultStoreyName = settings[building.userData.properties.name]?.defaultStorey;
      const defaultStorey = storeys.find(s => s.userData.properties.name === defaultStoreyName);
      if (defaultStorey) {
        this.selectLevel(defaultStorey, zoom);
      } else if (storeys.length) {
        this.selectLevel(storeys[0], zoom);
      }
    }
  }

  public async unselectBuilding(): Promise<void> {

    // Update variables first
    this.siteManager.scene.userData.selectedBuildingName = undefined;
    this.siteManager.scene.userData.selectedLevelName = undefined;
    this.selectedBuilding = undefined;
    this.selectedLevel = undefined;
    
    this.three.stylingService.removeAllOverlays();
    await this.siteManager.removeObjectFromScene('bim', undefined, undefined);
    this.three.stylingManager.disposeStyle('slice-above-level');
    this.three.stylingManager.apply();
  }

  @computedFrom('selectedBuilding.children.length')
  public get storeys(): Object3D[] {
    if (!this.selectedBuilding?.children) {
      return [];
    }
    return this.selectedBuilding.children.filter(o => o.userData.properties?.type === 'IFCBUILDINGSTOREY');
  }

  public async selectLevel(level: Object3D, zoom: 'none' | '3d' | 'top' = '3d'): Promise<void> {
    if (this.selectedLevel === level) {
      return;
    }
    const parent = level.parent;
    const previousLevel = this.selectedLevel ? this.selectedLevel?.userData?.storey : undefined;
    if (level.userData.properties.type === 'IFCBUILDINGSTOREY' && parent?.userData?.properties?.type === 'IFCBUILDING') {
      
      this.three.stylingService.removeAllOverlays();

      this.selectedBuilding = parent;
      this.selectedLevel = level;

      await this.siteManager.loadBIM(this.selectedBuilding.userData.building, this.selectedLevel.userData.storey, true);

      this.eventAggregator.publish('aurelia-three:site-navigator:select-storey', this.selectedLevel);
      this.three.stylingManager.apply();

      if (!previousLevel){
        if (zoom === '3d') {
          this.three.navigationControls.zoomOnObject(this.selectedLevel, Orientation["3d"]);
        } else if (zoom === 'top') {
          this.three.navigationControls.zoomOnObject(this.selectedLevel, Orientation["top"]);
        }      
      }

    }
  }

  @computedFrom('selectedBuilding.userData.properties.name')
  public get selectedBuildingName(): string {
    if (this.siteManager?.scene) this.siteManager.scene.userData.selectedBuildingName =  this.selectedBuilding ? this.selectedBuilding.userData.properties?.name || this.selectedBuilding.uuid  : '';
    return this.selectedBuilding ? this.selectedBuilding.userData.properties?.name || 'Building' : undefined;
  }

  @computedFrom('selectedLevel.userData.properties.name', 'selectedLevel.uuid')
  public get selectedLevelName(): string {
    if (this.siteManager?.scene) this.siteManager.scene.userData.selectedLevelName =  this.selectedLevel ? this.selectedLevel.userData.properties?.name || this.selectedLevel.uuid : '';
    return this.selectedLevel ? this.selectedLevel.userData.properties?.name || this.selectedLevel.uuid : undefined;
  }
}
