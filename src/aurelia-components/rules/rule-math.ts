import { RuleIOType } from './interfaces';
import { Rule } from './rule';
import * as math from 'mathjs';

export class RuleMath extends Rule {

  public readonly type = 'math';
  public readonly allowedInputTypes: RuleIOType[] = ['three-objects', 'scene'];


  public expression: string;
  private multiple = true;

  public async processRule(): Promise<void> {
    let arrayLength = 0;

    const inputs: {[key: string]: any} = {};
    // detect all required inputs
    for (let data of this.currentProcess.getData()) {
      if (this.expression.indexOf(data.varName) !== -1) {
        if (data.varName.indexOf(' ') !== -1) {
          throw new Error('Variable names used in Mathematical expression must not contain space');
        }
        const value = data.value;
        if (Array.isArray(value)) {
          const length = value.length;
          if (arrayLength === 0) {
            arrayLength = length;
          } else if (arrayLength === length) {
            // good
          } else {
            throw new Error('All array variables used in Mathematical expression must have the same length');
          }
        }
        inputs[data.varName] = data.value;
      }
    }

    this.multiple = arrayLength !== 0;

    const fct = math.compile(this.expression);

    if (!this.multiple) {
      const result = fct.evaluate(inputs);
      this.outputType = 'number';
      this.outputValue = result;
    } else {
      const results: number[] = [];
      for (let k = 0; k < arrayLength; k++) {
        const scope: {[key: string]: any} = {};
        for (const key in inputs) {
          const valueOrValues = inputs[key];
          if (Array.isArray(valueOrValues)) {
            scope[key] = valueOrValues[k];
          } else {
            scope[key] = valueOrValues;
          }
        }
        results.push(fct.evaluate(scope));
      }
      this.outputType = 'numbers';
      this.outputValue = results;
    }

  }

  

  public async summary(): Promise<void> {
    if (Array.isArray(this.outputValue)) {
      this.outputSummary = this.outputValue.slice(0, 3).join(', ');
    } else {
      this.outputSummary = this.outputValue.toString();
    }
  }

}

