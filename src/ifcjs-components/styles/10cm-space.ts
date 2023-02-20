import { StyleChecker } from '../../aurelia-components/styling/styling-manager';

export const space10cm: StyleChecker[] = [
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
        transform: {
          type: 'set-height',
          height: 0.1
        }
      }
    ],
    applyToChildren: false
  }
];

export default space10cm;
