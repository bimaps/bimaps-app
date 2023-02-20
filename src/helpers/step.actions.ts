//import { StepModel } from './../models/step';
//import { StepInterface } from '../models/step';
import { AppState } from '../state';

export function clearAllSteps(state: AppState) {
  const newState = Object.assign({}, state);
  /*newState.hsteps = {};
  newState.psteps = {};
  newState.rsteps = [];
  newState.osteps = {};
  newState.lastOpenedProjects = [];*/
  return newState;
}
