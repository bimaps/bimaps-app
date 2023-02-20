import { RuleIORef, RuleIOType } from './interfaces';
import { Rule } from './rule';
import * as THREE from 'three';

export class RuleTraverse extends Rule {

  public readonly type = 'traverse';
  public readonly allowedInputTypes: RuleIOType[] = ['three-objects', 'scene', 'three-object'];

  public value: any;
  private inputObjects: Array<THREE.Object3D> = [];

  constructor(inputName: string, outputName: string) {
    super();
    this.inputVarName = inputName;
    this.outputVarName = outputName;
  }

  public async processRule(): Promise<void> {
    const refs: RuleIORef[] = [];
    if (this.currentInput && this.currentInputType === 'three-objects') {
      this.inputObjects = [];
      for (const object of this.currentInput) {
        (object as THREE.Object3D).traverse((obj) => {
          this.inputObjects.push(obj);
          refs.push(obj)
        });
      }
    } else if (this.currentInput && ['scene', 'three-object'].includes(this.currentInputType)) {
      this.inputObjects = [];
      (this.currentInput as THREE.Scene).traverse((obj) => {
        this.inputObjects.push(obj);
        refs.push(obj)
      });
    } else {
      throw new Error('Invalid traverse input');
    }

    this.outputValue = this.inputObjects;
    this.outputType = 'three-objects';
    this.outputReference = refs;
  }

  public async summary(): Promise<void> {
    this.outputSummary = (this.outputValue as THREE.Object3D[]).slice(0, 3).map(o => o.name).join(', ');
  }

}
