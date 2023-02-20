import { RuleHelper } from './helper';
import { RuleIORef, RuleIOType } from './interfaces';
import { ThreeUtils } from '../three-utils';
import { Rule } from './rule';
import * as THREE from 'three';

export type RuleExtractType = 'faces' | 'edges' | 'vertices' | 'wireframe' | 'property';

export class RuleExtract extends Rule {

  public readonly type = 'extract';
  public readonly allowedInputTypes: RuleIOType[] = ['three-objects', 'scene', 'three-object'];

  public extractType: RuleExtractType;

  public value: any;

  public forceOutputAsNumber: boolean;

  private inputObjects: Array<THREE.Object3D> = [];
  private multiple = true;

  public async processRule(): Promise<void> {
    this.multiple = true;
    if (this.currentInput && this.currentInputType === 'three-objects') {
      this.inputObjects = this.currentInput as THREE.Object3D[];
    } else if (this.currentInput && this.currentInputType === 'scene') {
      this.inputObjects = [];
      (this.currentInput as THREE.Scene).traverse((obj) => {
        this.inputObjects.push(obj);
      });
    } else if (this.currentInput && this.currentInputType === 'three-object') {
      this.inputObjects = [this.currentInput as THREE.Object3D];
      this.multiple = false;
    } else {
      throw new Error('Invalid extract input');
    }

    const output: any[] = [];
    const refs: RuleIORef[] = [];
    for (const object of this.inputObjects) {
      if (this.extractType === 'property') {
        let value = RuleHelper.fetchProp(object, this.value);
        if (this.forceOutputAsNumber && typeof value !== 'number') {
          value = parseFloat(value);
        }
        output.push(value);
        refs.push(object);
      } else if (this.extractType === 'faces') {
        const faces = this.extractFaces(object);
        output.push(...faces);
        const refsForFaces: RuleIORef[] = Array(faces.length).fill(object);
        refs.push(...refsForFaces);
        this.outputType = 'triangles';
      } else if (this.extractType === 'edges') {
        const edges = this.extractEdges(object);
        output.push(...edges);
        const refForEdges: RuleIORef[] = Array(edges.length).fill(object);
        refs.push(...refForEdges);
        this.outputType = 'line3s';
      } else if (this.extractType === 'wireframe') {
        const wireframes = this.extractWireframe(object);
        output.push(...wireframes);
        const refForWireframes: RuleIORef[] = Array(wireframes.length).fill(object);
        refs.push(...refForWireframes);
        this.outputType = 'line3s';
      } else if (this.extractType === 'vertices') {
        const vertices = this.extractVertices(object);
        output.push(...vertices);
        const refForVertices: RuleIORef[] = Array(vertices.length).fill(object);
        refs.push(...refForVertices);
        this.outputType = 'vector3s'
      }
    }

    if (typeof output[0] === 'boolean') {
      this.outputType = this.multiple ? 'booleans' : 'boolean';
    } else if (typeof output[0] === 'number') {
      this.outputType = this.multiple ? 'numbers' : 'number';
    } else if (typeof output[0] === 'string') {
      this.outputType = this.multiple ? 'strings' : 'string';
    }

    this.outputValue = this.multiple ? output : output[0];
    this.outputReference = this.multiple ? refs : refs[0];
  }

  public async summary(): Promise<void> {
    if (this.extractType !== 'property' && Array.isArray(this.outputValue)) {
      this.outputSummary = `${this.outputValue.length} ${this.extractType}`;
    } else if (Array.isArray(this.outputValue)) {
      const firstValues = (this.outputValue as boolean[] | number[] | string[]).slice(0, 3);
      this.outputSummary = firstValues.join(', ');
    } else {
      this.outputSummary = '';
    }
  }

  private extractFaces(object: THREE.Object3D): THREE.Triangle[] {
    if (object instanceof THREE.Mesh) {
      return ThreeUtils.getBufferGeometryFaces(object.geometry);
    }
    return [];
  }

  private extractWireframe(object: THREE.Object3D): THREE.Line3[] {
    if (object instanceof THREE.Mesh) {
      return ThreeUtils.getBufferGeometryWireframe(object.geometry);
    }
    return [];
  }

  private extractEdges(object: THREE.Object3D): THREE.Line3[] {
    if (object instanceof THREE.Mesh) {
      return ThreeUtils.edgesFromObject(object);
    }
    return [];
  }

  private extractVertices(object: THREE.Object3D): THREE.Vector3[] {
    if (object instanceof THREE.Mesh) {
      return ThreeUtils.getBufferGeometryVertices(object.geometry);
    }
    return [];
  }

}
