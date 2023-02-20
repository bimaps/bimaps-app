import { ThreeSiteModel } from './site.model';
import { model, Model, type, io, validate, AppModel } from 'aurelia-deco';
let debug = require('debug')('app:models:three:signage');
import * as THREE from 'three';

export interface SignageItem {
  label: string;
  iconLeft: string;
  iconRight: string;
}

@model('/three/signage')
export class ThreeSignageModel extends Model {

  @type.id
  public id: string;

  @type.model({model: ThreeSiteModel})
  @validate.required
  public siteId: string;

  @type.string
  @validate.required
  public building: string;

  @type.string
  @validate.required
  public storey: string;

  @type.object({keys: {
    x: {type: 'float', required: true},
    y: {type: 'float', required: true},
    z: {type: 'float', required: true}
  }, allowOtherKeys: true})
  @validate.required
  public position: THREE.Vector3;

  @type.string
  public layout: string
  
  @type.float
  public fontScale = 1;

  @type.array({type: 'object', options: {
    keys: {
      label: {type: 'string'},
      iconLeft: {type: 'string'},
      iconRight: {type: 'string'},
    },
    allowOtherKeys: false
  }})
  public items: SignageItem[];

  @type.array({type: 'object', options: {keys: {
    x: {type: 'float', required: true},
    y: {type: 'float', required: true},
    z: {type: 'float', required: true}
  }, allowOtherKeys: true}})
  @type.object()
  public selectionPoints: THREE.Vector3[] = [];
}
