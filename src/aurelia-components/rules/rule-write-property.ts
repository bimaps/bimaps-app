import { RuleIOType } from './interfaces';
import { Rule } from './rule';
import { Object3D } from 'three';

export class RuleWriteProperty extends Rule {

  public readonly type = 'traverse';
  public readonly allowedInputTypes: RuleIOType[] = ['three-objects', 'three-object'];

  public value: any;
  private inputValuesName: string;
  private propertyPath: string;
  private writeInEachObjectsIfPossible = true;

  constructor(inputObjects: string, inputValues: string, propertyPath: string, writeInEachObjectsIfPossible = true) {
    super();
    this.inputVarName = inputObjects;
    this.inputValuesName = inputValues;
    this.propertyPath = propertyPath;
    this.writeInEachObjectsIfPossible = writeInEachObjectsIfPossible;
  }

  public async processRule(): Promise<void> {
    const inputValues = this.currentProcess.getInput(this.inputValuesName);
    const writeInEachObject = this.writeInEachObjectsIfPossible && Array.isArray(inputValues) && Array.isArray(this.currentInput) && inputValues.length === this.currentInput.length;

    const objects: Object3D[] = Array.isArray(this.currentInput) ? this.currentInput : [this.currentInput];

    for (let index = 0; index < objects.length; index++) {
      const object = objects[index];
      const value = writeInEachObject ? inputValues[index] : inputValues;
      object.userData[this.propertyPath] = value?.value;
    }

  }

  public async summary(): Promise<void> {
    this.outputSummary = 'Done';
  }

}
