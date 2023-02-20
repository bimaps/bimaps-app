import { StyleChecker } from '../../aurelia-components/styling/styling-manager';

export const spaceTransparent: StyleChecker[] = [
  {
    conditionOperator: 'and',
    conditions: [
      {
        key: 'userData.properties.type',
        value: 'IFCSPACE',
        operator: '='
      }
    ],
    definitions: [
      {
        opacity: 0
      }
    ],
    applyToChildren: false
  }
];

export default spaceTransparent;
