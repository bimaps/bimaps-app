import { StylingManager } from './styling/styling-manager';
import { StylingService } from './styling/styling-service';
import { Scene } from './scene';
import { CursorControls } from '../controls/cursor-controls';
import { ClippingControls } from './../controls/clipping-controls';
import { customElement, inject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { NavigationControls } from './../controls/navigation-controls';

@customElement('aurelia-three')
@inject(EventAggregator)
export class Three {

  public canvas: HTMLCanvasElement;
  public scene: Scene;
  public cursorControls: CursorControls;
  public clippingControls: ClippingControls;
  public stylingService: StylingService;
  public stylingManager: StylingManager;
  public navigationControls: NavigationControls;

  constructor(private eventAggregator: EventAggregator) {}

  public attached(): void {
    this.scene = new Scene(this.canvas);
    this.cursorControls = new CursorControls(this.scene.scene, this.scene.camera, this.scene.renderer);
    this.clippingControls = new ClippingControls(this.scene.camera, this.scene.renderer, this.scene.controls);
    this.stylingService = new StylingService(this.scene.scene, this.scene.renderer, this.scene.camera);
    this.stylingManager = new StylingManager(this.scene.scene, this.stylingService);
    this.navigationControls = new NavigationControls(this.scene.camera, this.scene.controls);
    this.setActivityListener();
  }

  public detached() {
    this.activityListenerSubscription.dispose();
  }

  private activityListenerSubscription: Subscription;
  private setActivityListener(): void {
    this.activityListenerSubscription = this.eventAggregator.subscribe('three:activity', (data: {id: string, label: string, percentage?: number}) => {
      const foundActivity = this.activities.find(a => a.id === data.id);
      if (foundActivity) {
        foundActivity.label = data.label;
        foundActivity.percentage = data.percentage;
      }
      if (foundActivity && data.percentage >= 100) {
        const index = this.activities.indexOf(foundActivity);
        this.activities.splice(index, 1);
      }
      if (!foundActivity && (data.percentage === undefined || data.percentage >= 0 && data.percentage < 100)) {
        const newActivity = {
          id: data.id,
          label: data.label,
          percentage: data.percentage
        };
        this.activities.push(newActivity)
      }
    });
  }

  private activities: {id: string, label: string, percentage?: number}[] = [];
  
  
  

}
