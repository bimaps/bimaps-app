import { StyleLabelDefinition, StyleIconDefinition, StyleGeometryDefinition, StyleDefinition } from './../aurelia-components/styling/styling-service';
import { model, Model, type, validate } from 'aurelia-deco';

export interface ThreePos {
  x: number;
  y: number;
  z: number;
}

@model('/three/style')
export class ThreeStyleModel extends Model {

  @type.id
  public id: string;

  @type.string
  @validate.required
  public name: string;

  @type.boolean
  public visible?: boolean;

  @type.string
  public color?: string;

  @type.array({type: 'string'})
  public colorByValue?: Array<string> = [];

  @type.string
  public colorByValueKey?: string;

  @type.file({accept: ['image/*']})
  public image?: any;

  @type.float
  public opacity?: number  = 1;

  @type.float
  public maxOpacity?: number;

  @type.boolean
  public depthTest?: boolean;

  // FIXME: this is not implemented. Either implement, or remove
  @type.integer
  public renderOrder?: number;

  @type.object({keys: {}, allowOtherKeys: true})
  public label?: StyleLabelDefinition;

  @type.object({keys: {}, allowOtherKeys: true})
  public icon?: StyleIconDefinition;
  
  @type.object({keys: {}, allowOtherKeys: true})
  public geometry?: StyleGeometryDefinition;
  
}
