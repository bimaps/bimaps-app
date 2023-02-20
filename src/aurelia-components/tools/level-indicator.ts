import { SelectToolObjectEvent } from './select-tool';
import { ThreeUtils } from './../three-utils';
import { IFCJSHelper } from './../../ifcjs-components/ifcjs-helper';
import { BaseTool } from './base-tool';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { inject, bindable, bindingMode } from 'aurelia-framework';
import { Three } from '../three';
import { Object3D, Plane, Vector3 } from 'three';
import { SiteManager } from '../site-manager';

export interface LevelIndicatorSetLevelActiveEvent {
  object: Object3D;
}

export interface LevelIndicatorSetAltitudeActiveEvent {
  building: Object3D;
  altitude: number;
}

@inject(EventAggregator, Three)
export class LevelIndicator extends BaseTool {

  @bindable({defaultBindingMode: bindingMode.toView}) private siteManager: SiteManager;
  private subscriptions: Subscription[] = [];
  private levelActive: Object3D;
  private levels: Object3D[] = [];
  private building: Object3D;

  private slicingActive = false;
  private slicingLevel: Object3D | undefined = undefined;
  private slicingPlane: Plane;

  constructor(eventAggregator: EventAggregator, private three: Three) {
    super(eventAggregator);
    
    // this.hoverBoxPosition = 'next-toolbar';
  }


  public attached(): void {
    super.attached();

    this.subscriptions.push(this.eventAggregator.subscribe('aurelia-three:level-indicator:set-level-active', (data: LevelIndicatorSetLevelActiveEvent) => {
      const storey = IFCJSHelper.getStoreyObject(data.object);
      if (storey) {
        this.active = true;
        this.levels = IFCJSHelper.getStoreysObjects(data.object, {orderByAltitudeDirection: 'DESC'});
        this.levelActive = storey;
        this.building = IFCJSHelper.getBuildingObject(storey);
      }
    }));

    this.subscriptions.push(this.eventAggregator.subscribe('aurelia-three:level-indicator:set-altitude-active', (data: LevelIndicatorSetAltitudeActiveEvent) => {
      const storeys = IFCJSHelper.getStoreysObjects(data.building, {orderByAltitudeDirection: 'DESC'});
      const storey = storeys.find((storey) => {
        const bbox = ThreeUtils.bboxFromObject(storey);
        return bbox.min.y < data.altitude;
      });
      
      if (storey) {
        this.active = true;
        this.levels = storeys
        this.levelActive = storey;
        this.building = IFCJSHelper.getBuildingObject(storey);
      }
    }));

    this.subscriptions.push(this.eventAggregator.subscribe('aurelia-three:select-tool:selected', (data: SelectToolObjectEvent) => {
      if (!data.object) {
        return;
      }
      const storey = IFCJSHelper.getStoreyObject(data.object);
      if (storey) {
        this.active = true;
        this.levels = IFCJSHelper.getStoreysObjects(storey, {orderByAltitudeDirection: 'DESC'});
        this.levelActive = storey;
        this.building = IFCJSHelper.getBuildingObject(storey);
      }
    }));
  }

  private initStyles(): void {
    if (!this.building) {
      this.three.stylingManager.disposeStyle('slicing-level');
      return;
    }
    this.slicingPlane = new Plane(new Vector3(0, -1, 0));
    (this.slicingPlane as any).name = 'level-indicator-slicing-plane';
    this.three.stylingManager.registerStyle('slicing-level', [
      {
        conditions: [
          {
            key: 'uuid',
            operator: '=',
            value: this.building?.uuid
          }
        ],
        conditionOperator: 'and',
        applyToChildren: true,
        definitions: [
          {
            clippingPlanes: [this.slicingPlane]
          }
        ]
      }
    ], 20, true);
  }

  public name(object: Object3D): string {
    return object ? object.userData.properties?.name || object.userData.properties?.type || object.uuid : '';
  }

  public toggleSlicing(level: Object3D): void {
    return;
    if (this.slicingActive && this.slicingLevel === level) {
      this.slicingActive = false;
      this.slicingLevel = undefined;
    } else {
      this.slicingActive = true;
      this.slicingLevel = level;
      this.zoomOnLevelActive();
    }
    this.updateSlicingStyles();
    console.log('this.slicingLevel', this.slicingLevel);
  }

  public clearSlicing(): void {
    this.slicingActive = false;
    this.slicingLevel = undefined;
    this.updateSlicingStyles();
  }

  private updateSlicingStyles(): void {
    if (this.slicingActive && this.slicingLevel) {
      this.initStyles();
      let sliceHeight: number | undefined = undefined;
      const spaces = IFCJSHelper.getStoreySpaces(this.slicingLevel);
      if (spaces.length) {
        // if we could find spaces, let's take the minimum space bbox y
        sliceHeight = Math.min(...spaces.map((space) => {
          const spaceBbox = ThreeUtils.bboxFromObject(space);
          return spaceBbox.max.y;
        }));
      } else {
        // we don't have spaces but we have a storey, let's take 2m above the minimum bbox y
        const storeyBbox = ThreeUtils.bboxFromObject(this.slicingLevel);
        sliceHeight = storeyBbox.min.y + 2;
      }

      this.slicingPlane.constant = sliceHeight;
      this.three.stylingManager.activateStyle('slicing-level');
    } else {
      this.three.stylingManager.deactivateStyle('slicing-level');
    }
    this.three.stylingManager.apply();
  }

  private zoomOnLevelActive(): void {
    this.three.navigationControls.zoomOnObject(this.levelActive, new Vector3(-1, -0.5, -1), 1.3);
  }
  
}
