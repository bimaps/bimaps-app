import { bindable } from 'aurelia-framework';
import { SiteNavigatorTool } from './site-navigator-tool';

export class BuildingIndicator {
  @bindable siteNavigator: SiteNavigatorTool;

  public close() {
    this.siteNavigator.unselectBuilding();
  }
}
