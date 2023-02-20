import { StyleChecker } from '../../aurelia-components/styling/styling-manager';

export const onlySpace: StyleChecker[] = [
  {
    conditionOperator: 'and',
    conditions: [
      {
        key: 'userData.properties.type',
        value: 'IFCSPACE',
        operator: '!='
      }
    ],
    definitions: [
      {
        opacity: 0
      }
    ],
    applyToChildren: false
  },
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
        opacity: 1
      }
    ],
    applyToChildren: false
  }
];

export default onlySpace;
