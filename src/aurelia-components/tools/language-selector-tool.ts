import { BaseTool } from './base-tool';
import { EventAggregator } from 'aurelia-event-aggregator';
import { inject, bindable, bindingMode} from 'aurelia-framework';
import { SiteManager } from './../site-manager';
import { Global } from '../../global';


@inject(Global, EventAggregator)
export class LanguageSelectorTool extends BaseTool {
  
  @bindable({defaultBindingMode: bindingMode.toView}) private siteManager: SiteManager;

  constructor(private global: Global, eventAggregator: EventAggregator) {
    super(eventAggregator);
    // this.hoverBoxPosition = 'next-toolbar';
  }

  public attached(): void {
    super.attached();
  }

  public detached(): void {
    super.detached();
  }

  public async selectLanguage(lg: string): Promise<void> {
     console.log('selectLanguage', lg);
     await this.global.store.dispatch('setLanguage', lg);
  }

}
