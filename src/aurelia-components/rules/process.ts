import { RuleIOType, RuleIORef } from './interfaces';
import { Rule } from './rule';

export interface ProcessData {
  varName: string,
  value: any,
  type: RuleIOType,
  ref: RuleIORef | RuleIORef[],
  summary: string
}

export type RuleInput = Omit<ProcessData, 'varName' | 'summary'>

export class Process {

  public rules: Rule[] = [];

  private data: ProcessData[] = [];

  public async run(initialData: ProcessData | ProcessData[]): Promise<void> {

    this.data = Array.isArray(initialData) ? [].concat(...initialData) : [initialData];

    for (const rule of this.rules) {
      await this.runRule(rule);
    }
  }

  public getData() {
    return this.data;
  }

  private async runRule(rule: Rule): Promise<void> {
    const inputData = this.getInput(rule.inputVarName);
    await rule.runProcessRule(this, inputData.value, inputData.type, inputData.ref);
    const outputData: ProcessData = {
      varName: rule.outputVarName,
      type: rule.outputType,
      value: rule.outputValue,
      ref: rule.outputReference,
      summary: rule.outputSummary
    };
    this.data.push(outputData);
  }

  public addData(data: ProcessData): void {
    this.data.push(data);
    console.log('this.data', this.data);
  }

  public getInput(varname: string): RuleInput  | undefined {
    for (const ruleData of this.data) {
      if (ruleData.varName === varname) {
        return {
          value: ruleData.value,
          type: ruleData.type,
          ref: ruleData.ref
        };
      }
    }

    return undefined;
  }

}
