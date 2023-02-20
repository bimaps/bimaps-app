import { RuleWriteProperty } from './../rules/rule-write-property';
import { RuleReducer } from './../rules/rule-reducer';
import { RuleTraverse } from './../rules/rule-traverse';
import { RuleFilterIfcType } from './../rules/ifc/rule-filter-ifc-type';
import { RuleProcess } from './../rules/rule-process';
import { RuleExtract } from './../rules/rule-extract';
import { RuleFilter } from './../rules/rule-filter';
import { BaseTool } from './base-tool';
import { EventAggregator } from 'aurelia-event-aggregator';
import { inject } from 'aurelia-framework';
import { Three } from '../three';
import { Process } from 'aurelia-components/rules/process';
import { Object3D } from 'three';

import { MeshLambertMaterial } from 'three';

@inject(EventAggregator, Three)
export class RulesTool extends BaseTool {

  private filterIFCWall = new RuleFilter();
  private extractIFCType = new RuleExtract();
  private extractFaces = new RuleExtract();

  constructor(eventAggregator: EventAggregator, private three: Three) {
    super(eventAggregator);
  }

  public attached(): void {
    super.attached();

    this.filterIFCWall = new RuleFilter();
    this.filterIFCWall.conditions.push({
      key: 'userData.properties.type',
      operation: '=',
      value: 'IFCWALLSTANDARDCASE'
    });
    this.filterIFCWall.inputVarName = 'scene';
    this.filterIFCWall.outputVarName = 'walls';

    this.extractIFCType = new RuleExtract();
    this.extractIFCType.extractType = 'property';
    this.extractIFCType.value = 'userData.properties.type';
    this.extractIFCType.inputVarName = 'walls';

    this.extractFaces = new RuleExtract();
    this.extractFaces.extractType = 'faces';
    this.extractFaces.inputVarName = 'walls';
  }

  public test(): void {
    
    const process = new Process();
    process.rules.push(this.filterIFCWall);
    process.rules.push(this.extractIFCType);
    process.rules.push(this.extractFaces);

    process.run({varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''});

  }

  public testChildProcess(): void {
    const getWallsProcess = new Process();
    getWallsProcess.rules.push(this.filterIFCWall);

    const extractIFCTypeProcess = new Process();
    extractIFCTypeProcess.rules.push(this.extractIFCType);

    const runChildProcess = new RuleProcess('walls', 'outputValue', extractIFCTypeProcess);

    getWallsProcess.rules.push(runChildProcess);

    getWallsProcess.run({varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''});
  }

  public async externalObjects(): Promise<void> {
    const process = new Process();

    const getExternalObjects = new RuleFilterIfcType('IFCWALLSTANDARDCASE', 'scene', 'walls');
    getExternalObjects.conditions.push({
      key: 'userData.properties.name',
      operation: '*',
      value: 'ext'
    });
    const writeExternal = new RuleWriteProperty('walls', 'isExternal', 'isExternal', true);
    
    process.rules.push(getExternalObjects);
    process.rules.push(writeExternal);

    await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
      varName: 'isExternal',
      value: true,
      type: 'boolean',
      ref: [],
      summary: 'true'
    }]);

    getExternalObjects.conditions = [{key: 'userData.properties.objectType', operation: '*', value: 'exterieur'}];
    await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
      varName: 'isExternal',
      value: true,
      type: 'boolean',
      ref: [],
      summary: 'true'
    }]);
    getExternalObjects.conditions = [{key: 'userData.properties.objectType', operation: '*', value: 'Vitré ext'}];
    await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
      varName: 'isExternal',
      value: true,
      type: 'boolean',
      ref: [],
      summary: 'true'
    }]);
    getExternalObjects.conditions = [{key: 'userData.properties.objectType', operation: '*', value: 'Maçonnerie 180'}];
    await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
      varName: 'isExternal',
      value: true,
      type: 'boolean',
      ref: [],
      summary: 'true'
    }]);
    // getExternalObjects.conditions = [{key: 'userData.properties.objectType', operation: '*', value: 'Maçonnerie 200'}];
    // await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
    //   varName: 'isExternal',
    //   value: true,
    //   type: 'boolean',
    //   ref: [],
    //   summary: 'true'
    // }]);
    getExternalObjects.conditions = [{key: 'userData.properties.objectType', operation: '*', value: 'Sol:Générique  210'}];
    await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
      varName: 'isExternal',
      value: true,
      type: 'boolean',
      ref: [],
      summary: 'true'
    }]);
    getExternalObjects.conditions = [{key: 'userData.properties.objectType', operation: '*', value: 'POTEAU FACADE PICTET'}];
    await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
      varName: 'isExternal',
      value: true,
      type: 'boolean',
      ref: [],
      summary: 'true'
    }]);
    getExternalObjects.conditions = [{key: 'userData.properties.objectType', operation: '*', value: 'fenetre ext'}];
    await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
      varName: 'isExternal',
      value: true,
      type: 'boolean',
      ref: [],
      summary: 'true'
    }]);
    getExternalObjects.conditions = [{key: 'userData.properties.objectType', operation: '*', value: 'profil poutre'}];
    await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
      varName: 'isExternal',
      value: true,
      type: 'boolean',
      ref: [],
      summary: 'true'
    }]);
    getExternalObjects.conditions = [{key: 'userData.properties.objectType', operation: '*', value: 'BORD DE DALLE'}];
    await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
      varName: 'isExternal',
      value: true,
      type: 'boolean',
      ref: [],
      summary: 'true'
    }]);
    getExternalObjects.conditions = [{key: 'userData.properties.objectType', operation: '*', value: 'Tourniquet'}];
    await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
      varName: 'isExternal',
      value: true,
      type: 'boolean',
      ref: [],
      summary: 'true'
    }]);
    // getExternalObjects.conditions = [{key: 'userData.properties.objectType', operation: '*', value: 'PLANCHER AC50'}];
    // await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
    //   varName: 'isExternal',
    //   value: true,
    //   type: 'boolean',
    //   ref: [],
    //   summary: 'true'
    // }]);
    getExternalObjects.conditions = [{key: 'userData.properties.objectType', operation: '*', value: 'Parapet'}];
    await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
      varName: 'isExternal',
      value: true,
      type: 'boolean',
      ref: [],
      summary: 'true'
    }]);
    getExternalObjects.conditions = [{key: 'userData.properties.objectType', operation: '*', value: 'avec creux'}];
    await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
      varName: 'isExternal',
      value: true,
      type: 'boolean',
      ref: [],
      summary: 'true'
    }]);
    getExternalObjects.conditions = [{key: 'userData.properties.objectType', operation: '*', value: 'Toit'}];
    await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
      varName: 'isExternal',
      value: true,
      type: 'boolean',
      ref: [],
      summary: 'true'
    }]);


    getExternalObjects.conditions = [
      {key: 'userData.properties.globalId', operation: '=', value: '1465mop_DFqfpYo8Dwav3y'},
      {key: 'userData.properties.globalId', operation: '=', value: '1465mop_DFqfpYo8DwavXO'},
      {key: 'userData.properties.globalId', operation: '=', value: '1xwvi_6_n44wmVapVhEK44'},
      {key: 'userData.properties.globalId', operation: '=', value: '2L4FA_KWr0o8clOmSGGOzx'},
      {key: 'userData.properties.globalId', operation: '=', value: '2L4FA_KWr0o8clOmSGGOXT'},
    ];
    getExternalObjects.conditionsOperator = 'or';
    await process.run([{varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''}, {
      varName: 'isExternal',
      value: true,
      type: 'boolean',
      ref: [],
      summary: 'true'
    }]);

    console.log('process', process);

    const objectsToStyle: Object3D[] = [];
    let nbObjects = 0;
    this.three.scene.scene.traverse((o) => {
      nbObjects++;
      if (o.userData.isExternal === true) {
        objectsToStyle.push(o);
      }
    });

    console.log('objectsToStyle', objectsToStyle);
    console.log('nbObjects', nbObjects);

    for (const object of objectsToStyle) {
      this.three.stylingService.applyStyle(object, {
        visible: true,
        color: 'red',
        opacity: 0.2
      });
    }

  }

  public async nbCollaborators(): Promise<void> {

    const countCollaborators = new Process();
    const traverseStorey = new RuleTraverse('storey', 'storey_objects');
    const getCollaborators = new RuleFilterIfcType('IFCBUILDINGELEMENTPROXY', 'storey_objects', 'collaborators');
    getCollaborators.conditions.push({
      key: 'userData.properties.objectType',
      operation: '=',
      value: 'PCO_Collaborateur:PCO_Collaborateur'
    });
    getCollaborators.conditions.push({
      key: 'userData.properties.objectType',
      operation: '=',
      value: 'FM_COLLABORATEUR:Collaborateur'
    });
    getCollaborators.conditionsOperator = 'and';
    const sumOfCollaborators = new RuleReducer('collaborators', 'nbCollaborators', 'count');
    const writeSumInStorey = new RuleWriteProperty('storey', 'nbCollaborators', 'nbCollaborators', false);
    countCollaborators.rules.push(traverseStorey);
    countCollaborators.rules.push(getCollaborators);
    countCollaborators.rules.push(sumOfCollaborators);
    countCollaborators.rules.push(writeSumInStorey);
    const childProcess = new RuleProcess('storeys', 'nbCollaborators', countCollaborators);
    
    const globalProcess = new Process();
    const getStoreys = new RuleFilterIfcType('IFCBUILDINGSTOREY', 'scene', 'storeys');
    globalProcess.rules.push(getStoreys);
    globalProcess.rules.push(childProcess);
    await globalProcess.run({varName: 'scene', value: this.three.scene.scene, type: 'scene', ref: undefined, summary: ''});


    const storeysToStyle: Object3D[] = [];
    this.three.scene.scene.traverse((o) => {
      if (typeof o.userData.nbCollaborators === 'number') {
        storeysToStyle.push(o);
      }
    });

    for (const object of storeysToStyle) {
      this.three.stylingService.applyStyle(object, {visible: true, label: {
        visible: true,
        template: '#{object:userData.properties.name}: #{object:userData.nbCollaborators}',
        backgroundColor: 'red',
        textColor: 'white',
        scale: 1,
        centroidMethod: 'default',
        opacity: 1,
      }});
    }

    const collaboratorsToStyle: Object3D[] = [];
    this.three.scene.scene.traverse((o) => {
      if (o.userData.properties?.type === 'IFCBUILDINGELEMENTPROXY') {
        collaboratorsToStyle.push(o);
      }
    });

    for (const object of collaboratorsToStyle) {
      this.three.stylingService.applyStyle(object, {
        visible: true, 
        material: new MeshLambertMaterial({color: 'red'}),
        geometry: {
          default: 'cone',
          scale: 0.5,
          centroidMethod: 'default',
        }
      });
    }

  }

}
