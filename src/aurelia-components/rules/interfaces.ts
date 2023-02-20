export type RuleIOType = 
    'scene'
  | 'three-objects'
  | 'three-object'
  | 'triangles'
  | 'triangle'
  | 'line3s'
  | 'line3'
  | 'vector3s'
  | 'vector3'
  | 'vector2s'
  | 'vector2'
  | 'box3s'
  | 'box3'
  | 'strings'
  | 'string'
  | 'numbers'
  | 'number'
  | 'booleans'
  | 'boolean'
  | 'json';

export type RuleIORef = THREE.Object3D | THREE.Object3D[] | undefined;

export interface RuleValueCondition {
  operation: string;
  value: string | Date;
}

export interface RuleObjectCondition extends RuleValueCondition {
  key: string;
}

export type RuleConditionOperator = 'or' | 'and';
