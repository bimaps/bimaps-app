import { ThreeSiteModel } from './../../models/site.model';
import { SelectDialog } from './../../components/dialogs/select';
import { StyleChecker, StyleCondition } from './../styling/styling-manager';
import { BaseTool } from './base-tool';
import { EventAggregator } from 'aurelia-event-aggregator';
import { inject, bindable } from 'aurelia-framework';
import { jsonify } from 'aurelia-deco';
import { Three } from '../three';
import { Object3D } from 'three';

interface FilteringRule {
  active: boolean;
  name: string;
  conditions: StyleCondition[];
  conditionOperator: 'and' | 'or';
}

@inject(EventAggregator, Three)
export class FilterTool extends BaseTool {

  @bindable siteId: string;

  private filteringRules: FilteringRule[] = [];
  private selectedRule: FilteringRule | undefined;
  private useAndOperatorInRule = true;
  private keyValues: {[key: string]: (string | number | boolean)[]} | undefined = undefined;

  constructor(eventAggregator: EventAggregator, private three: Three) {
    super(eventAggregator);
  }

  public attached(): void {
    super.attached();

    this.subs.push(this.eventAggregator.subscribe('aurelia-three:filter-tool:add-rule', (rule: FilteringRule) => {
      this.filteringRules.push(rule);
      this.applyFiltering();
    }));
    this.subs.push(this.eventAggregator.subscribe('aurelia-three:filter-tool:filter-object', (object: Object3D) => {
      const rule: FilteringRule = {
        name: `Hide ${object.userData.properties?.name || object.uuid}`,
        conditionOperator: 'and',
        conditions: [
          {
            key: 'uuid',
            operator: '=',
            value: object.uuid
          }
        ],
        active: true
      };
      this.filteringRules.push(rule);
      this.applyFiltering();
    }));
    this.subs.push(this.eventAggregator.subscribe('aurelia-three:filter-tool:reset', () => {
      this.resetFilters();
    }));
  }

  public async siteIdChanged(): Promise<void> {
    this.keyValues = undefined;
    if (this.siteId) {
      try {
        this.keyValues = await ThreeSiteModel.api.get(`/three/site/${this.siteId}/key-values`).then(jsonify);
      } catch (error) {
        // fail silently
      }
    }
  }

  public resetFilters(): void {
    this.filteringRules = [];
    this.applyFiltering();
  }

  public applyFiltering(): void {
    const checkers: StyleChecker[] = [];
    for (const rule of this.filteringRules) {
      if (!rule.active) {
        continue;
      }
      checkers.push({
        conditionOperator: rule.conditionOperator,
        conditions: rule.conditions,
        definitions: [
          {visible: false}
        ],
        applyToChildren: false
      });
    }
    this.three.stylingManager.registerStyle('filtering', checkers, 110, true);
    this.three.stylingManager.apply();
  }

  public removeFilteringRules(): void {
    this.three.stylingManager.disposeStyle('filtering');
  }

  public toggleRuleActive(rule: FilteringRule, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.notifyChangeInRule();
  }

  public createNewRule(): void {
    const newRule: FilteringRule = {
      active: true,
      name: 'New Rule',
      conditionOperator: 'or',
      conditions: [
        {
          key: '',
          operator: '=',
          value: ''
        }
      ]
    };
    this.filteringRules.push(newRule);
    this.selectRule(newRule);
  }

  public selectRule(rule: FilteringRule): void {
    this.useAndOperatorInRule = rule.conditionOperator === 'and';
    this.selectedRule = rule;
  }

  public editRule(rule: FilteringRule): void {
    this.selectRule(rule);
  }

  public unselectRule(): void {
    this.selectedRule = undefined;
  }

  public addConditionToRule(): void {
    this.selectedRule.conditions.push({
      key: '',
      operator: '=',
      value: ''
    });
    this.notifyChangeInRule();
  }
  public removeConditionFromRule(conditionIndex: number): void {
    this.selectedRule.conditions.splice(conditionIndex, 1);
    this.notifyChangeInRule();
  }
  public async openKeyListForCondition(index: number): Promise<void> {
    const condition = this.selectedRule.conditions[index];
    if (!condition || !this.keyValues) {
      return;
    }
    const options = Object.keys(this.keyValues).map(k => {
      return {value: k, label: k};
    });
    const response = await SelectDialog.renderModal({title: 'Select a key', options});
    if (!response.wasDismissed) {
      condition.key = response.value;
    }
    this.notifyChangeInRule();
  }
  public async openValueListForCondition(index: number): Promise<void> {
    const condition = this.selectedRule.conditions[index];
    if (!condition || !this.keyValues) {
      return;
    }
    const values = this.keyValues[condition.key];
    if (!values?.length) {
      return;
    }
    const options = values.map(k => {
      return {value: `${k}`, label: `${k}`};
    });
    const response = await SelectDialog.renderModal({title: 'Select a value', options});
    if (!response.wasDismissed) {
      condition.value = response.value;
    }
    this.notifyChangeInRule();
  }
  public setConditionOperator(conditionIndex: number, operator: '=' | '<' | '>' | '!=' | '*'): void {
    this.selectedRule.conditions[conditionIndex].operator = operator;
    this.notifyChangeInRule();
  }

  public notifyChangeInRule(): void {
    if (this.selectedRule) {
      this.selectedRule.conditionOperator = this.useAndOperatorInRule ? 'and' : 'or';
    }
    setTimeout(() => {
      this.applyFiltering();
    }, 100);
  }

  public deleteSelectedRule(): void {
    if (!this.selectedRule) {
      return;
    }
    const index = this.filteringRules.indexOf(this.selectedRule);
    if (index !== -1) {
      this.filteringRules.splice(index, 1);
      this.unselectRule();
      this.applyFiltering();
    }
  }

  

}
