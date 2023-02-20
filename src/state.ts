import { SwissdataState, AppState as SwissdataAppState, DynamicDataModel } from 'aurelia-deco';
import * as environment from '../config/environment.json';
import settings from 'settings';
import { State as BcfState, initialState as bcfInitialState } from 'aurelia-bcf';

// DECLARE A "AppState" INTERFACE, EXTENDING "SwissdataAppState"
// This interface must include any new key for the state of this specific app
export interface AppState extends SwissdataAppState, BcfState {
  swissdata: SwissdataState;
  surpriseHidden: boolean;
}

// DEFINE THE "initalState" BASED ON THE "AppState" INTERFACE
export const initialState: AppState = {
  stateVersion: settings.stateVersion,
  sdlogin: {},
  swissdata: {
    authenticated: false,
    publicKey: environment.swissdata.apiKey,
    user: undefined,
    accessToken: undefined,
    loginStep: 'login',
    h: ''
  },
  bcf: bcfInitialState.bcf,
  language: 'fr',
  languages: ['fr', 'en'],
  country: 'CH',
  countries: ['CH'],
  currentRoute: {
    name: settings.defaultRoutes.unauthenticated
  },
  surpriseHidden: false
}

// DEFINE AN ACTION CALLED "initAppState" THAT TAKE ANY KIND OF STATE
// AND RETURN A VALID STATE ACCORDING TO CURRENT DEFINITION (ABOVE)
// IT MUST CHECK THE VALIDITY OF EACH KEY AND CORRECT ITS VALUE IF NECESSARY
export function initAppState(state: AppState) {
  const newState = Object.assign({}, state);
  if (typeof newState.currentRoute !== 'object') newState.currentRoute = initialState.currentRoute;
  if (newState.supriseHidden === undefined) newState.supriseHidden = false;
  if (newState.bcf === undefined) newState.bcf = bcfInitialState.bcf;
  return newState;
}

