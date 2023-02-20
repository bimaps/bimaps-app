import { RuleHelper } from './helper';
import { RuleConditionOperator, RuleObjectCondition, RuleIOType } from './interfaces';
import { Rule } from './rule';

export class RuleFilter extends Rule {

  public readonly type = 'filter';
  public readonly allowedInputTypes: RuleIOType[] = ['three-objects', 'scene'];

  public conditions: RuleObjectCondition[] = [];
  public conditionsOperator: RuleConditionOperator = 'and';

  private inputObjects: Array<THREE.Object3D> = [];

  public async processRule(): Promise<void> {
    if (this.currentInput && this.currentInputType === 'three-objects') {
      this.inputObjects = this.currentInput as THREE.Object3D[];
      // process filtering
    } else if (this.currentInput && this.currentInputType === 'scene') {
      this.inputObjects = [];
      (this.currentInput as THREE.Scene).traverse((obj) => {
        this.inputObjects.push(obj);
      });
    } else {
      throw new Error('Invalid filter input');
    }

    const output: THREE.Object3D[] = [];
    for (const object of this.inputObjects) {
      let keep = false;
      for (let condition of this.conditions) {
        keep = RuleHelper.compareObject(object, condition);
        if (keep && this.conditionsOperator === 'or') {
          break;
        }
        if (!keep && this.conditionsOperator === 'and') {
          break;
        }
      }
      if (keep) {
        output.push(object);
      }
    }

    this.outputType = 'three-objects';
    this.outputValue = output;
  }

  public async summary(): Promise<void> {
    if (Array.isArray(this.outputValue)) {
      this.outputSummary = `${this.outputValue.length} elements`;
    } else {
      this.outputSummary = '';
    }
  }

}
