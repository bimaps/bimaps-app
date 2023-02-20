import { ColorRepresentation } from 'three';
import { StyleChecker } from '../aurelia-components/styling/styling-manager';

const departments: {name: string, color: ColorRepresentation}[] = [
  {name: 'CLIENT', color: 'green'},
  {name: 'TAX', color: 'blue'},
  {name: 'DIRECTION', color: 'yellow'},
  {name: 'SOLUTIONS', color: 'yellow'},
  {name: 'MANAGEMENT', color: 'orange'},
  {name: 'MANAGEMENT', color: 'orange'},
];

export const spaceColors: StyleChecker[] = departments.map((dep) => {
  return {
    conditionOperator: 'and',
    conditions: [
      {
        key: 'userData.properties.type',
        value: 'IFCSPACE',
        operator: '='
      },
      {
        key: 'userData.pset.Données.properties.Departement (rm).value',
        operator: '=',
        value: dep.name
      }
    ],
    definitions: [
      {
        color: dep.color
      }
    ],
    applyToChildren: false
  }
});


export default spaceColors;
