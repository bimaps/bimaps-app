import { BaseTool } from './base-tool';
import { EventAggregator } from 'aurelia-event-aggregator';
import { inject, bindable, bindingMode } from 'aurelia-framework';
import { Three } from '../three';
import { SiteManager } from './../site-manager';


@inject(EventAggregator, Three)
export class SpatialStructureTool extends BaseTool {

  @bindable({defaultBindingMode: bindingMode.toView}) public siteManager: SiteManager;


  constructor(eventAggregator: EventAggregator, private three: Three) {
    super(eventAggregator);
    this.hoverBoxPosition = 'next-toolbar';
  }

  public attached(): void {
    super.attached();
  }

}
