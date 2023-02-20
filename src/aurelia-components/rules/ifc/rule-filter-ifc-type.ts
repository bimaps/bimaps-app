import { RuleFilter } from './../rule-filter';

export class RuleFilterIfcType extends RuleFilter {

  constructor(type: string, inputName: string, outputName: string) {
    super();
    this.conditions.push({
      key: 'userData.properties.type',
      operation: '=',
      value: type
    });
    this.outputVarName = outputName;
    this.inputVarName = inputName;
  }

}
