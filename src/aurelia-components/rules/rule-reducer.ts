import { RuleIOType, RuleIORef } from './interfaces';
import { Rule } from './rule';

export type RuleReducerOperation = 'min' | 'max' | 'average' | 'count' | 'sum';
export class RuleReducer extends Rule {

  public readonly type = 'reducer';
  public readonly allowedInputTypes: RuleIOType[] = ['three-objects', 'numbers', 'strings'];

  public operation: RuleReducerOperation;

  constructor(inputName: string, outputName: string, operation: RuleReducerOperation) {
    super();
    this.inputVarName = inputName;
    this.outputVarName = outputName;
    this.operation = operation;
  }

  public async processRule(): Promise<void> {

    if (!Array.isArray(this.currentInput)) {
      throw new Error('Reducer module only accepts array as input');
    }

    let mathInput: number[];
    if (this.operation === 'min' || this.operation === 'max' || this.operation === 'average' || this.operation === 'sum') {
      if (this.currentInputType === 'numbers') {
        mathInput = this.currentInput as number[];
      } else if (this.currentInputType === 'strings') {
        mathInput = (this.currentInput as string[]).map(s => parseFloat(s));
      } else {
        throw new Error('Min, max, average and sum reducers modules only accepts number, numbers, string and strings as input');
      }
      this.outputType = 'number';
      if (this.operation === 'min') {
        // this.outputValue = Math.min(...mathInput); // very bad perf with spread for large arrays
        // const min = mathInput.reduce((m, n) => Math.min(m, n)); // average perf with reduce for large arrays
        const min = Math.min.apply(null, mathInput); // best perf with min.apply for large arras
        const refKeys = [...Object.keys(mathInput)].filter(i => mathInput[parseInt(i, 10)] === min);
        this.outputValue = min;
        const inputRefs = (this.currentInputRef as RuleIORef[]) || [];
        this.outputReference = inputRefs.filter((v, i) => refKeys.includes(i.toString()));
      } else if (this.operation === 'max') {
        // this.outputValue = Math.max(...mathInput);  // very bad perf with spread for large arrays
        // const max = mathInput.reduce((m, n) => Math.max(m, n)); // average perf with reduce for large arrays
        const max = Math.max.apply(null, mathInput); // best perf with max.apply for large arras
        const refKeys = [...Object.keys(mathInput)].filter(i => mathInput[parseInt(i, 10)] === max);
        this.outputValue = max;
        const inputRefs = (this.currentInputRef as RuleIORef[]) || [];
        this.outputReference = inputRefs.filter((v, i) => refKeys.includes(i.toString()));
      } else if (this.operation === 'sum') {
        this.outputReference = this.currentInputRef;
        this.outputValue = mathInput.reduce((a, b) => a + b, 0);
      } else if (this.operation === 'average') {
        this.outputValue = mathInput.reduce((a, b) => a + b, 0) / mathInput.length;
        this.outputReference = this.currentInputRef;
      }
    } else if (this.operation === 'count') {
      this.outputType = 'number';
      this.outputValue = this.currentInput.length;
      this.outputReference = this.currentInputRef;
    }
  }

  public async summary(): Promise<void> {
    let out = this.outputValue !== undefined ? this.outputValue : '';
    if (typeof out === 'number') {
      out = Math.round(out * 1000) / 1000;
    }
    this.outputSummary = out.toString();
  }

}

