import { StyleChecker } from '../../aurelia-components/styling/styling-manager';

export const buildingTransparent: StyleChecker[] = [
  {
    conditionOperator: 'and',
    conditions: [
      {
        key: 'userData.properties.type',
        value: 'IFCBUILDING',
        operator: '='
      },
      {
        key: 'userData.properties.type',
        value: 'xIFCBUILDINGELEMENTPROXY',
        operator: '!='
      }
    ],
    definitions: [
      {
        opacity: 0.3
      }
    ],
    applyToChildren: true
  }
];

export default buildingTransparent;
