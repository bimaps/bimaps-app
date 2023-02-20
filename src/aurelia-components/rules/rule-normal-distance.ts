import { RuleIOType, RuleIORef } from './interfaces';
import { Rule } from './rule';
import * as THREE from 'three';

export class RuleNormalDistance extends Rule {

  public readonly type = 'normal-distance';
  public readonly allowedInputTypes: RuleIOType[] = ['triangle', 'triangles', 'line3', 'line3s', 'vector3', 'vector3s'];

  public inputVarName2?: string;
  public operation: 'min' | 'max' = 'min';

  private sameInputs = false;

  public async processRule(): Promise<void> {
    this.sameInputs = this.inputVarName === this.inputVarName2;
    const inputA = this.currentInput as THREE.Triangle | THREE.Triangle[] | THREE.Line3 | THREE.Line3[] | THREE.Vector3 | THREE.Vector3[];
    // const inputAType = this.currentInputType as 'triangle' | 'triangles' | 'line3' | 'line3s' | 'vector3' | 'vector3s';
    if (!this.inputVarName2) {
      throw new Error('Missing inputVarName2');
    }
    const input2Value = this.currentProcess.getInput(this.inputVarName2);
    if (!input2Value) {
      throw new Error('Input requested not found');
    }
    if (!this.allowedInputTypes?.includes(input2Value.type)) {
      throw new Error('Invalid input2 type');
    }
    const inputB = input2Value.value as THREE.Triangle | THREE.Triangle[] | THREE.Line3 | THREE.Line3[] | THREE.Vector3 | THREE.Vector3[];
    // const inputBType = input2Value.type as 'triangle' | 'triangles' | 'line3' | 'line3s' | 'vector3' | 'vector3s';


    const distances: Array<number> = [];
    const refs: Array<RuleIORef> = [];
    let iAs = Array.isArray(inputA) ? inputA : [inputA];
    let iBs = Array.isArray(inputB) ? inputB : [inputB];
    let refA = Array.isArray(this.currentInputRef) ? this.currentInputRef : [this.currentInputRef];
    let refB = Array.isArray(input2Value.ref) ? input2Value.ref : [input2Value.ref];
    if (iAs.length !== refA.length) {
      throw new Error('Invalid references for input A');
    }
    if (iBs.length !== refB.length) {
      throw new Error('Invalid references for input B');
    }
    const operation = this.operation || 'min';
    
    type ProcessRef = {
      value?: number;
      refA: THREE.Object3D;
      refB: THREE.Object3D;
    };

    const processRefs: {[key: string]: ProcessRef} = {};

    for (const indexA in iAs) {
      const iA = iAs[indexA];
      const rA = refA[indexA] as THREE.Object3D;
      for (const indexB in iBs) {
        const rB = refB[indexB] as THREE.Object3D;
        if (this.sameInputs && rA === rB) {
          continue; // we ignore the same objects if we compare twich the same input
        }
        const processRefKey = processRefs[`${rB.uuid}:${rA.uuid}`] ? `${rB.uuid}:${rA.uuid}` : `${rA.uuid}:${rB.uuid}`;
        if (!processRefs[processRefKey]) {
          processRefs[processRefKey] = {
            refA: rA,
            refB: rB
          };
        }
        const iB = iBs[indexB];
        let distance: number | undefined;
        if (iA instanceof THREE.Vector3 && iB instanceof THREE.Vector3) {
          distance = this.pointPoint(iA, iB);
        } else if (iA instanceof THREE.Vector3 && iB instanceof THREE.Line3) {
          distance = this.pointLine(iA, iB);
        } else if (iA instanceof THREE.Line3 && iB instanceof THREE.Vector3) {
          distance = this.pointLine(iB, iA);
        } else if (iA instanceof THREE.Vector3 && iB instanceof THREE.Triangle) {
          distance = this.pointFace(iA, iB);
        } else if (iA instanceof THREE.Triangle && iB instanceof THREE.Vector3) {
          distance = this.pointFace(iB, iA);
        } else if (iA instanceof THREE.Line3 && iB instanceof THREE.Line3) {
          distance = this.LineLine(iA, iB);
        } else if (iA instanceof THREE.Line3 && iB instanceof THREE.Triangle) {
          distance = this.LineFace(iA, iB);
        } else if (iA instanceof THREE.Triangle && iB instanceof THREE.Line3) {
          distance = this.LineFace(iB, iA);
        } else if (iA instanceof THREE.Triangle && iB instanceof THREE.Triangle) {
          distance = this.FaceFace(iA, iB);
        } else {
          throw new Error('Invalid normal distance requested');
        }
        if (distance !== undefined) {
          if (operation === 'max') {
            processRefs[processRefKey].value = processRefs[processRefKey].value ? Math.max(processRefs[processRefKey].value as number, distance) : distance;
          } else {
            processRefs[processRefKey].value = processRefs[processRefKey].value ? Math.min(processRefs[processRefKey].value as number, distance) : distance;
          }
        }
      }
      if (this.sameInputs) {
        break;
      }
    }

    for (const key in processRefs) {
      const processRef = processRefs[key];
      if (processRef.value === undefined) {
        continue;
      }
      distances.push(processRef.value);
      refs.push([processRef.refA, processRef.refB]);
    }

    this.outputType = 'numbers';
    this.outputValue = distances;
    this.outputReference = refs;
  }

  public pointPoint(i1: THREE.Vector3, i2: THREE.Vector3): number {
    return i1.distanceTo(i2);
  }

  public pointLine(i1: THREE.Vector3, i2: THREE.Line3): number {
    const p: THREE.Vector3 = new THREE.Vector3;
    i2.closestPointToPoint(i1, true, p);
    return i1.distanceTo(p);
  }

  public pointFace(i1: THREE.Vector3, i2: THREE.Triangle): number {
    const p: THREE.Vector3 = new THREE.Vector3;
    i2.closestPointToPoint(i1, p);
    return i1.distanceTo(p);
  }

  public LineLine(i1: THREE.Line3, i2: THREE.Line3): number {
    const p: THREE.Vector3 = new THREE.Vector3;
    const pp: Array<number> = [];
    i1.closestPointToPoint(i2.start, true, p);
    pp.push(i2.start.distanceTo(p));
    i1.closestPointToPoint(i2.end, true, p);
    pp.push(i2.end.distanceTo(p));
    i2.closestPointToPoint(i1.start, true, p);
    pp.push(i1.start.distanceTo(p));
    i2.closestPointToPoint(i1.end, true, p);
    pp.push(i1.end.distanceTo(p));
    return Math.min(...pp);
  }

  public LineFace(i1: THREE.Line3, i2: THREE.Triangle): number {
    const p: THREE.Vector3 = new THREE.Vector3;
    const pp: Array<number> = [];
    // distance from line to each points of the face
    // TODO: Fix formula
    i1.closestPointToPoint(i2.a, true, p);
    pp.push(i2.a.distanceTo(p));
    i1.closestPointToPoint(i2.b, true, p);
    pp.push(i2.b.distanceTo(p));
    i1.closestPointToPoint(i2.c, true, p);
    pp.push(i2.c.distanceTo(p));
    // distance from the face to each point of the line
    i2.closestPointToPoint(i1.start, p);
    pp.push(i1.start.distanceTo(p));
    i2.closestPointToPoint(i1.end, p);
    pp.push(i1.end.distanceTo(p));
    return Math.min(...pp);
  }

  public FaceFace(i1: THREE.Triangle, i2: THREE.Triangle): number {
    const p: THREE.Vector3 = new THREE.Vector3;
    const pp: Array<number> = [];
    i1.closestPointToPoint(i2.a, p);
    pp.push(i2.a.distanceTo(p));
    i1.closestPointToPoint(i2.b, p);
    pp.push(i2.b.distanceTo(p));
    i1.closestPointToPoint(i2.c, p);
    pp.push(i2.c.distanceTo(p));
    i2.closestPointToPoint(i1.a, p);
    pp.push(i1.a.distanceTo(p));
    i2.closestPointToPoint(i1.b, p);
    pp.push(i1.b.distanceTo(p));
    i2.closestPointToPoint(i1.c, p);
    pp.push(i1.c.distanceTo(p));
    return Math.min(...pp);
  }

  public async summary(): Promise<void> {
    if (Array.isArray(this.outputValue)) {
      this.outputSummary = `${this.outputValue.length} distances (${(this.outputValue as number[]).slice(0, 3).map(v => {return Math.round(v * 1000) / 1000}).join(', ')})`;
    } else {
      this.outputSummary = '';
    }
  }

}

