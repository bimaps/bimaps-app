import { Aurelia, Container } from 'aurelia-framework'
import { PLATFORM } from 'aurelia-pal';
import { initialState } from 'state';
import { settings} from 'settings';
import * as environment from '../../config/environment.json';
import { i18nSetup } from 'aurelia-deco';
// import * as icons from '@aurelia-ux/icons/sets/full.json';

const version = environment.version ? Object.values(environment.version).join('') : '';

Container.instance.registerInstance('sd-settings', settings);

export function registerCorePlugins(aurelia: Aurelia) {
  aurelia.use
    .plugin(PLATFORM.moduleName('aurelia-validation'))
    .plugin(PLATFORM.moduleName('aurelia-dialog'))
    .plugin(PLATFORM.moduleName('aurelia-i18n'),  i18nSetup({
      aurelia: aurelia as any, // we pass as any here because otherwise we get a TS error when running in SRC mode
      host: environment.swissdata.host, 
      apiKey: environment.swissdata.apiKey, 
      translationMemoryApiKey: environment.swissdata.translationMemoryApiKey,
      translationMemoryHost: environment.swissdata.translationMemoryHost,
      defaultLanguage: settings.language
    }))
    .plugin(PLATFORM.moduleName('@aurelia-ux/core'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/button'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/card'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/checkbox'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/chip-input'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/datepicker'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/form'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/grid'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/icons'), {icons: []})
    .plugin(PLATFORM.moduleName('@aurelia-ux/input'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/input-info'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/list'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/lookup'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/modal'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/positioning'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/radio'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/select'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/slider'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/switch'))
    .plugin(PLATFORM.moduleName('@aurelia-ux/textarea'))
    .plugin(PLATFORM.moduleName('aurelia-notify'))
    .plugin(PLATFORM.moduleName('aurelia-store'), {
      initialState: initialState,
      logDispatchedActions: settings.stateLog.dispatchedActions,
      logPerformanceLog: settings.stateLog.performanceLog,
      logDevToolsStatus: settings.stateLog.devToolsStatus,
      logDefinitions: {
        dispatchedActions: settings.stateLog.dispatchedActions,
        performanceLog: settings.stateLog.performanceLog,
        devToolsStatus: settings.stateLog.devToolsStatus
      }
    })

    .plugin(PLATFORM.moduleName('bcx-aurelia-reorderable-repeat'))
    .plugin(PLATFORM.moduleName('aurelia-ui-virtualization'))
    .plugin(PLATFORM.moduleName('aurelia-resources'), {stripe: {apiKey: environment.stripe.apiKey}})
    .plugin(PLATFORM.moduleName('aurelia-deco'), {
      api: {
        ipStack: {apiKey: environment.ipstack.apiKey},
        version,
        host: environment.swissdata.host,
        publicKey: environment.swissdata.apiKey
      },
      registerMissingTranslationKeys: true
    })
    .feature(PLATFORM.moduleName('components/index'));
}
