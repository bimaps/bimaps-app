import { SignageTool } from './signage-tool';
import { ThemesTool } from './themes-tool';
import { GroupsTool } from './groups-tool';
import { SpatialStructureTool } from './spatial-structure-tool';
import { RulesTool } from './rules-tool';
import { SceneTool } from './scene-tool';
import { SitesTool } from './sites-tool';
import { BaseTool } from './base-tool';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { inject, bindable } from 'aurelia-framework';
import { Three } from '../three';
import { Rights } from '../rights';
import { Global } from 'global';

@inject(EventAggregator, Three, Rights, Global)
export class SettingsTool extends BaseTool {

  @bindable groupsTool: GroupsTool;
  @bindable spatialStructureTool: SpatialStructureTool;
  @bindable signageTool: SignageTool;
  @bindable rulesTool: RulesTool;
  @bindable sceneTool: SceneTool;
  @bindable sitesTool: SitesTool;
  @bindable themesTool: ThemesTool;

  constructor(eventAggregator: EventAggregator, private three: Three, private rights: Rights, private global: Global) {
    super(eventAggregator);
    this.hoverBoxPosition = 'next-toolbar';
  }


  public attached(): void {
    super.attached();
    this.listenForGhostClose();
  }

  public detached(): void {
    super.detached();
    this.listenForGhostSubscriber.dispose();
  }

  public handleEvent(event: MouseEvent): void {
    super.handleEvent(event);
  }

  public openTool(tool: BaseTool): void {
    tool.toggleOpened();
    this.ghostOpened = tool;
  }

  private ghostOpened: BaseTool;
  private listenForGhostSubscriber: Subscription;
  private listenForGhostClose() {
    this.listenForGhostSubscriber = this.eventAggregator.subscribe('aurelia-three:toolbar:close-tool', (tool: BaseTool) => {
      if (tool === this.ghostOpened && !this.opened) {
        this.toggleOpened();
        this.ghostOpened = undefined;
      }
    });
  }

  public testMyRights(): void {
    console.info('myRights', this.rights.getMyRights())
  }
  
}
