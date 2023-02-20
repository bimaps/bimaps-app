import { RuleObjectCondition, RuleValueCondition } from './interfaces';
import * as moment from 'moment';
import { Parser } from 'aurelia-resources';
import resolvePath from 'object-resolve-path';
import * as THREE from 'three';

export class RuleHelper {
  public static fetchProp(object: THREE.Object3D, propPath: string): any {

    if (propPath.indexOf('#{') !== -1 || propPath.indexOf('!#') !== -1) {
      propPath = propPath.replace(/(#{|!{)/gm, '$1object:');
      return Parser.parseTemplate(propPath, {object});
    }
    
    const parts = propPath.split('.');
    for (let i = 0; i < parts.length; i++) {
      if (i === 0) {
        continue;
      }
      parts[i] = `["${parts[i]}"]`;
    }
    const key = parts.join('');
    return resolvePath(object, key);
  }

  public static compareObject(object: THREE.Object3D, condition: RuleObjectCondition): boolean {
    const value = this.fetchProp(object, condition.key);
    return this.compareValue(value, condition);
  }

  public static compareValue(value: string | boolean | number | Date, condition: RuleObjectCondition | RuleValueCondition): boolean {
    if (typeof condition.value === 'number' && typeof value === 'string') {
      value = parseFloat(value);
    } else if (condition.value instanceof Date && typeof value === 'string') {
      value = moment(value).toDate();
    }
    if (condition.operation === '=') {
      if (this.makeNumberIfPossible(value) != this.makeNumberIfPossible(condition.value)) return false;
    } else if (condition.operation === '!=') {
      if (this.makeNumberIfPossible(value) == this.makeNumberIfPossible(condition.value)) return false;
    } else if (condition.operation === '<') {
      if (this.makeNumberIfPossible(value) > this.makeNumberIfPossible(condition.value)) return false;
    } else if (condition.operation === '>') {
      if (this.makeNumberIfPossible(value) < this.makeNumberIfPossible(condition.value)) return false;
    } else if (condition.operation === '*') {
      if (typeof condition.value !== 'string' && condition.value.toString) condition.value = condition.value.toString();
      if (value && typeof value !== 'string' && value.toString) value = value.toString();
      if (typeof value !== 'string' || typeof condition.value !== 'string') {
        // could not convert values to string
        return false;
      }
      if (value.toLowerCase().indexOf(condition.value.toLowerCase()) === -1) return false;
    }
    return true;
  }

  private static makeNumberIfPossible(input: string | any): number | any {
    if (typeof input !== 'string') {
      return input;
    }
    const num = parseFloat(input.trim());
    return `${num}` === input.trim() ? num : input;
  }
}
