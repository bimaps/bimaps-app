import { Global } from 'global';
import { inject, Container } from 'aurelia-framework';
//import { StepModel, StepInterface } from 'models/step';
//import { updateSteps, removeStep, clearAllSteps, setProjectAsLastOpened } from './step.actions';
import { jsonify } from 'aurelia-deco';
import * as moment from 'moment';

@inject(Global)
export class StepHelper {

  private static _global: Global;

  static get global() {
    if (!StepHelper._global) {
      StepHelper._global = Container.instance.get(Global);
    }
    return StepHelper._global;
  }

  constructor(private global: Global) {

  }

  static registerActions() {
    /*this.global.store.registerAction('updateSteps', updateSteps);
    this.global.store.registerAction('removeStep', removeStep);
    this.global.store.registerAction('clearAllSteps', clearAllSteps);
    this.global.store.registerAction('setProjectAsLastOpened', setProjectAsLastOpened);*/
  }

  static clearAllSteps(): Promise<any> {
    //return this.global.store.dispatch(clearAllSteps);
    return Promise.resolve();
  }

}
