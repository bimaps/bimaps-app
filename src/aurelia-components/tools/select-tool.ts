import { BaseTool } from './base-tool';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { inject } from 'aurelia-framework';
import { Three } from '../three';
import { Vector2, Object3D, Scene, Intersection, Mesh, Vector3 } from 'three';
import { CursorControls } from './../../controls/cursor-controls';

export interface SelectToolObjectEvent {
  object: Object3D | undefined;
  mouse?: Vector2;
  intersect?: Intersection;
}

@inject(EventAggregator, Three)
export class SelectTool extends BaseTool {

  public active = false;
  private selectedObject: Object3D | undefined = undefined;

  constructor(eventAggregator: EventAggregator, private three: Three) {
    super(eventAggregator);
  }

  public toggle(): void {
    this.active = !this.active;
    this.notifyActive();
  }

  public attached(): void {
    this.subs.push(this.eventAggregator.subscribe('aurelia-three:select-tool:activate', () => {
      this.active = true;
      this.notifyActive();
    }));
    this.subs.push(this.eventAggregator.subscribe('aurelia-three:select-tool:deactivate', () => {
      this.active = false;
      this.notifyActive();
    }));
    this.subs.push(this.eventAggregator.subscribe('aurelia-three:select-tool:toggle', () => {
      this.active = !this.active;
      this.notifyActive();
    }));
    this.subs.push(this.eventAggregator.subscribe('aurelia-three:select-tool:select', (data: {object: Object3D}) => {
      if (data.object) {
        this.selectObject(data.object);
      } else {
        this.unselect();
      }
    }));
    this.listenToCursor();
  }

  public detached(): void {
    super.detached();
    // TODO: dispose listenToCursor
  }

  private cursorDownOrigin: Vector2 | undefined;
  public listenToCursor(): void {
    this.three.cursorControls.addEventListener('objects-intersects', async (data: {type: 'objects-intersects', target: CursorControls, gestureType: 'down' | 'up' | 'move', objectsIntersects: THREE.Intersection[], scene: Scene, position: Vector2}) => {
      if (!this.active) {
        return;
      }
      if (data.gestureType === 'down') {
        this.cursorDownOrigin = data.position.clone();
        return;
      } else if (data.gestureType === 'up' && this.cursorDownOrigin) {
        if (this.cursorDownOrigin.equals(data.position)) {
          // process as a click
          this.cursorDownOrigin = undefined;
        } else {
          // cursor has moved, ignore
          this.cursorDownOrigin = undefined;
          return;1
        }
      } else {
        return;
      }

      if (data.objectsIntersects.length > 0) {
        this.selectObject(data.objectsIntersects[0].object, data.position, data.objectsIntersects[0]);
      } else if (data.objectsIntersects.length === 0) {
        this.unselect();
      }
    });
  }

  private selectObject(object: Object3D, mouse?: Vector2, intersect?: Intersection): void {
    this.selectedObject = object;
    this.notifySelect({object: this.selectedObject, mouse, intersect});
    this.styleSelectedObject();
  }

  private unselect(mouse?: Vector2): void {
    console.log('unselect');
    this.selectedObject = undefined;
    this.notifySelect({object: undefined, mouse, intersect: undefined});
    this.unstyleSelectedObject();
  }

  private styleSelectedObject(): void {
    const type = this.selectedObject.userData.properties?.type;
    if (type === 'IFCSite') {
      return;
    } else if (this.selectedObject instanceof Mesh) {
      this.setMeshSelectionStyle(this.selectedObject);
    } else {
      this.setGroupSelectionStyle(this.selectedObject);
    }
  }

  private unstyleSelectedObject(): void {
    this.three.stylingManager.disposeStyle('selected-object');
    this.three.stylingManager.apply();
  }

  private setMeshSelectionStyle(object: Object3D): void {
    this.three.stylingManager.registerStyle('selected-object', [
      {
        conditions: [
          {
            key: 'uuid',
            operator: '=',
            value: object.uuid
          }
        ],
        conditionOperator: 'and',
        applyToChildren: false,
        definitions: [
          {
            bbox: {
              color: 'white',
              opacity: 1,
              depthTest: false,
              clipLikeMaterial: true
            },
            highlight: {
              color: 'cyan',
              depthTest: false,
              opacity: 0.5,
              clipLikeMaterial: true
            },
            label: {
              visible: true,
              textColor: '#fff',
              backgroundColor: '#0F6A70',
              scale: 0.8,
              position: new Vector3(0, 1.8, 0),
              centroidMethod: 'default',
              opacity: 1,
              template: '#{object:userData.pset.Données.properties.Prénom (em).value} ' + '#{object:userData.pset.Données.properties.Nom de famille (em).value}'
            }
          }
        ]
      }
    ], 100, true);
    this.three.stylingManager.apply()
  }

  private setGroupSelectionStyle(object: Object3D): void {
    this.three.stylingManager.registerStyle('selected-object', [
      {
        conditions: [
          {
            key: 'uuid',
            operator: '=',
            value: object.uuid
          }
        ],
        conditionOperator: 'and',
        applyToChildren: false,
        definitions: [
          {
            bbox: {
              color: 'magenta',
              opacity: 1,
              depthTest: false,
              clipLikeMaterial: true
            },
            bboxFill: {
              color: 'magenta',
              opacity: 0.1,
              depthTest: true,
              clipLikeMaterial: true
            },
          }
        ]
      }
    ], 100, true);
    this.three.stylingManager.apply();
  }

  private notifyActive(): void {
    this.eventAggregator.publish('aurelia-three:select-tool:changed', this.active);
  }

  private notifySelect(event: SelectToolObjectEvent): void {
    this.eventAggregator.publish('aurelia-three:select-tool:selected', event);
  }

  

}
