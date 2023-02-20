import { NavigationToolNewPathEvent } from './../aurelia-components/tools/navigation-tool';
import { space10cm } from './../ifcjs-components/styles/10cm-space';
import { Orientation } from './../controls/navigation-controls';
import { SearchToolConfig } from './../aurelia-components/tools/search-tool';
import { ThreeObjectModel } from './../models/object.model';
import { Three } from '../aurelia-components';
import { CursorControls } from '../controls/cursor-controls';
import * as THREE from 'three';
import { Object3D, Scene } from 'three';
import { inject, TaskQueue } from 'aurelia-framework';
import { IfcJsSelectControls } from '../ifcjs-components/ifcjs-select-controls';
import { SiteManager } from './../aurelia-components/site-manager';
import { SitesTool } from './../aurelia-components/tools/sites-tool';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Global } from '../global';
import { Rights } from './../aurelia-components/rights';
import '../custom/configurator';

@inject(TaskQueue, EventAggregator, Global, Rights)
export class Admin {

  public three: Three;
  public siteId: string = '';
  public ifcJsControls: IfcJsSelectControls;
  public siteManager: SiteManager;
  public sitesTool: SitesTool;

  private subscriptions: Subscription[] = [];

  constructor(private taskQueue: TaskQueue, private eventAggregator: EventAggregator, private global: Global, private rights: Rights) {
    
  }

  public attached(): void {
    this.taskQueue.queueMicroTask(() => {
      this.three.cursorControls.threshold = 0.1;
      this.three.stylingManager.registerStyle('space-10cm', space10cm, 6);
      this.consoleLogClickedObject();
      this.listenToSearchSelection();
      this.listenToSpatialStructureSelection();
      this.ifcJsControls = new IfcJsSelectControls(this.three.scene.scene, this.three.cursorControls);
    });
    
    // Load Site
    let siteId = localStorage.getItem('current-site-id');
    if (siteId && this.siteId == '') {
      this.siteId = siteId;
    } 
    this.subscriptions.push(this.eventAggregator.subscribeOnce('aurelia-three:sites:fetched', () => {
      this.loadSite(this.siteId);
    }));
    
  }

  public detached(): void {
    for (const sub of this.subscriptions) {
      sub.dispose();
    }
    this.subscriptions = [];
  }

  
  public async loadSite(siteId: string): Promise<void> {
    await this.sitesTool.selectSite(siteId, true);
  }


  private consoleLogClickedObject(): void {
    this.three.cursorControls.addEventListener('objects-intersects', async (data: {type: 'objects-intersects', target: CursorControls, gestureType: 'down' | 'up' | 'move', objectsIntersects: THREE.Intersection[]}) => {
      if (data.gestureType === 'down' && data.objectsIntersects.length > 0) {
        console.log('first clicked object', data.objectsIntersects[0].object);
        console.log('intersections', data.objectsIntersects);

        const firstObject = data.objectsIntersects[0].object;
        console.log('firstObject', firstObject);
      }
    });
  }

  private listenToSearchSelection(): void {
    this.subscriptions.push(this.eventAggregator.subscribe('aurelia-three:search-tool:clicked-object', async (data: {object: ThreeObjectModel, scene: Scene, siteManager: SiteManager, config: SearchToolConfig, startNav: boolean}) => {
      if (this.siteManager !== data.siteManager) {
        return;
      }
      if (this.three.scene.scene !== data.scene) {
        return;
      }

      await this.siteManager.loadBIM(data.object.building, data.object.storey, true);

      setTimeout(() => {
        const selectedObject = this.siteManager.getObjectById(data.object.id);
        this.eventAggregator.publish('aurelia-three:select-tool:select', {object: selectedObject});
        if (data.startNav) {
          const event: NavigationToolNewPathEvent = {
            from: null,
            to: selectedObject
          };
          this.eventAggregator.publish('aurelia-three:navigation:new-path', event);
        } else {
          this.three.navigationControls.zoomOnObject(selectedObject, Orientation["3d"], 3);
        }
      }, 1000);


    }));
  }

  private listenToSpatialStructureSelection(): void {
    this.subscriptions.push(this.eventAggregator.subscribe('aurelia-three:spatial-structure-tool:clicked-object', (data: {object: Object3D, scene: Scene, siteManager: SiteManager}) => {
      this.eventAggregator.publish('aurelia-three:select-tool:select', {object: data.object});
    }));
  }

}
