import { ThreeObjectModel } from '../../internal';
import { BaseTool } from './base-tool';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { inject, bindable, bindingMode } from 'aurelia-framework';
import { Three } from '../three';
import { Parser } from 'aurelia-resources';
import { SiteManager } from './../site-manager';
import { Menu, MenuItem } from '@microsoft/fast-foundation';

export interface SearchToolConfig {
  ifcType?: string;
  name: string;
  properties: string[];
  operator: 'or' | 'and';
  nameTemplate: string;
  subnameTemplate?: string;
  results?: ThreeObjectModel[];
  limit?: number;
  // TODO: maybe we can add a theme to auto open when selecting such an object
  // TODO: maybe we can add auto-navigation or such
}

@inject(EventAggregator, Three)
export class SearchTool extends BaseTool {

  @bindable({defaultBindingMode: bindingMode.toView}) private siteManager: SiteManager;
  @bindable({defaultBindingMode: bindingMode.toView}) siteId: string;

  private search: string = '';
  public static configs: SearchToolConfig[] = [];
  
  private mode: 'focus' | 'search' | 'results' = 'focus';
  private configSelector: Menu;

  public subscriptions: Subscription[] = [];
  public activeWalking: boolean = false;

  constructor(eventAggregator: EventAggregator, private three: Three) {
    super(eventAggregator);
    this.hoverBoxPosition = 'next-toolbar';
    // document.addEventListener('click', this);
    // document.addEventListener('touchstart', this);
    document.addEventListener('keydown', this);
  }

  public getConfigs(): SearchToolConfig[] {
    return SearchTool.configs || [];
  }

  public attached(): void {
    super.attached();

    this.subscriptions.push(this.eventAggregator.subscribe('aurelia-three:search-tool:reset', () => {
      this.search = '';
      this.mode = 'focus';
    }));
  }

  public detached(): void {
    for (const sub of this.subscriptions) {
      sub.dispose();
    }
    this.subscriptions = [];
    // document.removeEventListener('click', this);
    // document.removeEventListener('touchstart', this);
    document.removeEventListener('keydown', this);
  }

  private activeSearch(){
    this.mode = 'search';
  }

  private closeSearch() {
    this.search = '';
    this.mode = 'focus';
  }

  public async runSearch(): Promise<void> {

    const menuItems = this.configSelector.querySelectorAll('fast-menu-item[role="menuitemcheckbox"]');

    for (let index = 0; index < this.getConfigs().length; index++) {
      const menuItem = menuItems.item(index) as MenuItem;
      const config = this.getConfigs()[index];
      config.results = [];
      config.limit = 3;
      if (!menuItem.checked) {
        continue;
      }
      const mainQuery: {$and: {[key: string]: any}[]} = {$and: []};
      if (config.ifcType) {
        mainQuery.$and.push({"userData.properties.type": config.ifcType});
      }
      const propQuery: {
        $or?: {[key: string]: {$regex: string, $options: string}}[];
        $and?: {[key: string]: {$regex: string, $options: string}}[];
      } = {};
      const subQueries: {[key: string]: {$regex: string, $options: string}}[] = [];
      for (const property of config.properties) {
        const subQuery: {[key: string]: {$regex: string, $options: string}} = {};
        subQuery[property] = {$regex: this.search, $options: 'i'};
        subQueries.push(subQuery);
      }
      if (config.operator === 'or') {
        propQuery.$or = subQueries;
      } else {
        propQuery.$and = subQueries;
      }
      mainQuery.$and.push(propQuery);
      const suffix = `&__global__=<${JSON.stringify(mainQuery)}>`;
      const objects = await ThreeObjectModel.getAll(`?siteId=${this.siteId}${suffix}&limit=100`);
      config.results = objects;
    }

    this.mode = 'results';
  }

  public resultText(object: ThreeObjectModel, template: string): string {
    return Parser.parseTemplate(template, {object});
  }

  public dispatchClickObject(object: ThreeObjectModel, config: SearchToolConfig, startNav = false, event: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.search = '';
    this.mode = 'focus';
    this.eventAggregator.publish('aurelia-three:search-tool:clicked-object', {
      object, 
      config, 
      siteManager: this.siteManager, 
      scene: this.three.scene.scene,
      startNav: startNav
    });
  }


  public async handleEvent(event: Event): Promise<void> {
    if (event instanceof MouseEvent || event instanceof TouchEvent) {
     
    } else if (event instanceof KeyboardEvent) {
      if (event.key === 'Escape' && this.mode === 'search') {
        this.search = '';
        this.mode = 'focus';
      } else if (event.key === 'Escape' && this.mode === 'results') {
        this.mode = 'search'
      } else if (event.key === 'Enter' && this.mode === 'search' && this.search && this.search != '') { 
          this.runSearch();
      } else if (event.key === 'Enter' && this.mode === 'focus') { 
        this.mode = 'search';
        if (this.search && this.search != '') {
          setTimeout(() => {
            this.runSearch();
          }, 200);
        }
      }
    }
  }

}
