import {PLATFORM} from 'aurelia-pal';
import {RouteConfig} from 'aurelia-router';

export let routes: Array<RouteConfig> = [
  { route: '',       name: 'home',       moduleId: PLATFORM.moduleName('pages/viewer') },
  { route: 'admin',       name: 'admin',       moduleId: PLATFORM.moduleName('pages/admin') },
  { route: 'importer',       name: 'importer',       moduleId: PLATFORM.moduleName('pages/importer') },
  { route: 'login',       name: 'login',       moduleId: PLATFORM.moduleName('pages/login-page', 'login'), settings: {auth: false} },
  { route: 'account',       name: 'account',       moduleId: PLATFORM.moduleName('pages/account', 'account'), settings: {auth: true} },
  { route: 'profile',       name: 'profile',       moduleId: PLATFORM.moduleName('pages/account-profile', 'account'), settings: {auth: true} },
  { route: 'credentials',       name: 'credentials',       moduleId: PLATFORM.moduleName('pages/account-credentials', 'account'), settings: {auth: true} },
  { route: 'dico',       name: 'dico',       moduleId: PLATFORM.moduleName('aurelia-deco/components/dico2/dico', 'dico'), settings: { auth: true } },
];

export default routes;
