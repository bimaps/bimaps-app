import {Aurelia} from 'aurelia-framework'
import * as environment from '../config/environment.json';
import {PLATFORM} from 'aurelia-pal';
import { registerCorePlugins } from 'base/base-main';
import './import-fast';
import { Aurelia1FASTAdapter } from 'aurelia1-fast-adapter';
Aurelia1FASTAdapter.tags['CALENDAR'] = ['date', 'dates', 'from', 'end'];
Aurelia1FASTAdapter.tags['DATE-FIELD'] = ['value'];
Aurelia1FASTAdapter.tags['TEXT-FIELD-LOGIN'] = ['value'];

export function configure(aurelia: Aurelia) {
  aurelia.use
    .standardConfiguration()
  registerCorePlugins(aurelia);
  aurelia.use
    .plugin(PLATFORM.moduleName('aurelia-bcf'), {
      host: `${environment.swissdata.host}/bcf/2.1`, // 'http://localhost:3000/bcf/2.1',
      extendEndpoint: (url) => {
        if (url.indexOf('?') === -1) return url + `?apiKey=${environment.swissdata.apiKey}`;
        return url + `&apiKey=${environment.swissdata.apiKey}`;
      },
      ignoreDebugs: false
    })
    .plugin(PLATFORM.moduleName('aurelia1-fast-adapter'), 'fast')
    .feature(PLATFORM.moduleName('aurelia-components/index'))
    .feature(PLATFORM.moduleName('resources/index'));

  aurelia.use.developmentLogging(environment.debug ? 'debug' : 'warn');

  if (environment.testing) {
    aurelia.use.plugin(PLATFORM.moduleName('aurelia-testing'));
  }

  aurelia.start().then(() => aurelia.setRoot(PLATFORM.moduleName('app')));
}

