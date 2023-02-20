import { bindable, computedFrom } from 'aurelia-framework';
import { typeOf } from 'mathjs';

export class ObjectProperty {

  @bindable public data: {[key: string]: any};
  @bindable public key: string;
  @bindable public isPset = false;
  @bindable public isPsetProperty = false;

  @computedFrom('data', 'key')
  public get isPrimitive(): boolean {
    const value = this.data[this.key];
    return typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
  }
  
  @computedFrom('data', 'key')
  public get isTripleValues(): boolean {
    if (this.data.x != null && this.data.y != null && this.data.z != null) {
      return true;
    } else if (this.data._x != null && this.data._y != null && this.data._z != null) {
      return true;
    } else {
      return false;
    }
 }

  public keys(data: {[key: string]: any}): string[] {
    return data ? Object.keys(data) : [];
  }
}
