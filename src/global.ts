import { inject, computedFrom } from 'aurelia-framework';
import { AppState, initAppState, initialState } from 'state';
import { setFullState, clearState } from 'base/base-actions';
import { SwissdataGlobal, ProfileHelper } from 'aurelia-deco';
import { errorify } from 'aurelia-resources';
import { Store } from 'aurelia-store';
import settings from 'settings';
import { BindingSignaler } from 'aurelia-templating-resources';
import * as moment from 'moment';
import 'moment/locale/fr'

@inject(Store, BindingSignaler)
export class Global extends SwissdataGlobal {

  public ready = false;

  constructor(public store: Store<AppState>, private signal: BindingSignaler) {
    super();
    //let store = Container.instance.get(Store);
    this.store.registerAction('initAppState', initAppState);
    this.store.registerAction('setFullState', setFullState);
    this.store.registerAction('clearState', clearState);
    this.log.debug('bootstrap');
    this.bootstrap({
      stateStorageKey: settings.stateStorageKey,
      language: settings.language,
      languages: settings.languages,
      dynamicModelSlugsForAutoLoading: [],
      initialState: initialState,
      stateVersion: settings.stateVersion
    }).then(() => {
      this.subscribe('language:changed', (language) => {
        this.log.info('language:changed');
        moment.locale(language);
        this.signal.signal('language-changed');
      });
      moment.locale(this.state.language);
      this.ready = true;
    });
  }

  public async logout() {
    try {
      await this.sdLogin.logout();
    } catch (error) {
      errorify(error);
    }
    //this.swissdataApi.logout();
    this.navigateToRoute(settings.defaultRoutes.unauthenticated);
  }

  registerActions() {
    super.registerActions();
    ProfileHelper.registerActions();
  }

  @computedFrom('state.swissdata.authenticated', 'state.swissdata.user.roles')
  get hasAdminRole() {
    if (!this.state.swissdata?.authenticated) {
      return false;
    }
    if (!this.state.swissdata?.user?.roles) {
      return false;
    }
    return this.state.swissdata.user.roles.indexOf('admin') !== -1;
  }

  //
  // Possible methods to overwrite
  // * start() - called before anything else in the bootstrap method
  // * beforeEnsuringAuthentication()
  // * afterEnsuringAuthentication()
  // * onAnyLoad() - by default: if config.useDynamicModels is true => 
  //    => load the dynamic models settings and 
  //    => autload dynamic data from dynamicModelSlugsForAutoLoading
  // * onAuthenticatedLoad() - calls onAnyLoad by default
  // * onUnauthenticatedLoad - calls onAnyLoad by default
  // * onLogin() - calls onAuthenticatedLoad by default
  // * onLogout()
  // * registerActions() - make sure to call super.registerActions() inside
  // 

}

