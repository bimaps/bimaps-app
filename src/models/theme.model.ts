import { ThreeStyleModel } from './style.model';
import { model, Model, type, validate } from 'aurelia-deco';
import { Logger, getLogger } from 'aurelia-logging';
import { StyleChecker } from './../aurelia-components/styling/styling-manager';

export interface StylingRule extends Omit<StyleChecker, 'definitions'> {
  styles: string[];
}

const log: Logger = getLogger('theme-model');

@model('/three/theme')
export class ThreeThemeModel extends Model {

  @type.id
  public id: string;

  @type.string
  @validate.required
  public name: string;

  @type.array({type: 'any'})
  public stylingRules: Array<StylingRule> = [];

  public async computeStylesForStylingManager(): Promise<StyleChecker[]> {
    if (this.stylingRules.length === 0) {
      return [];
    }
    const styleIds: string[] = this.stylingRules.reduce((prev, curr) => {
      prev.push(...curr.styles);
      return prev;
    }, []);
    if (styleIds.length === 0) {
      return [];
    }

    const styleCheckers: StyleChecker[] = [];
    const styles = await ThreeStyleModel.getAll(`?id=${styleIds.join(',')}`);
    const stylesById: {[key: string]: ThreeStyleModel} = styles.reduce((prev, curr) => {
      prev[curr.id] = curr;
      return prev;
    }, {});
    for (const stylingRule of this.stylingRules) {
      const checker: StyleChecker = {
        conditions: stylingRule.conditions,
        conditionOperator: stylingRule.conditionOperator,
        definitions: stylingRule.styles.map(id => stylesById[id])
      }
      styleCheckers.push(checker);
    }

    return styleCheckers;
  }

  
}
