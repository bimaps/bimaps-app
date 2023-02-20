import { AppState, initialState } from 'state';

export function setFullState(state: AppState, fullState: AppState) {
  const newState = Object.assign({}, fullState);
  return newState;
}

export function clearState(state: AppState) {
  const accounts = state.sdlogin.accounts;
  const host = state.swissdata.h;
  const newState = Object.assign({}, initialState);
  newState.sdlogin.accounts = accounts;
  newState.swissdata.h = host;
  return newState;
}
