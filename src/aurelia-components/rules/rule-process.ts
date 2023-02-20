import { Process } from './process';
import { RuleIOType } from './interfaces';
import { Rule } from './rule';

export class RuleProcess extends Rule {

  public readonly type = 'process';
  public readonly allowedInputTypes: RuleIOType[] = ['three-objects'];

  public processToRun: Process;

  constructor(inputName: string, outputName: string, processToRun: Process) {
    super();
    this.inputVarName = inputName;
    this.outputVarName = outputName;
    this.processToRun = processToRun;
  }

  public async processRule(): Promise<void> {

    if (!this.processToRun.rules.length) {
      return;
    }

    const firstRuleInputVar = this.processToRun.rules[0].inputVarName;

    for (let index in this.currentInput) {
      const obj = this.currentInput[index];
      const ref = Array.isArray(this.currentInputRef) && this.currentInputRef?.length === this.currentInput?.length
                  ? this.currentInputRef[index]
                  : undefined;

      await this.processToRun.run({varName: firstRuleInputVar, value: obj, type: 'three-object', ref: ref, summary: ''});
    }
  }
}
