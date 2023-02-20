import { ThreeThemeModel } from './theme.model';
import { ThreeSiteModel } from './site.model';
import { model, Model, type, io, validate, AppModel, UserModel, jsonify } from 'aurelia-deco';

type action = 'site_read' | 'site_write' | 'signage_read' | 'signage_write' | 'theme_read' | 'theme_write' | 'group_manage' | 'group_write';
const actions = ['site_read', 'site_write', 'signage_read', 'signage_write', 'theme_read', 'theme_write', 'group_manage', 'group_write'];
export interface ThreeUserSiteRight {
  'site_read': boolean;
  'site_write': boolean;
  'signage_read': boolean;
  'signage_write': boolean;
  'theme_read': boolean | string[];
  'theme_write': boolean | string[];
  'group_manage': string[];
  'group_write': boolean;
}

export interface ThreeUserRights {
  allSites: ThreeUserSiteRight;
  [key: string]: Omit<ThreeUserSiteRight, 'group_manage' | 'group_write'>;
}

@model('/three/group')
export class ThreeGroupModel extends Model {

  @type.id
  public id: string;

  @type.string
  @validate.required
  public name: string;

  // pour limiter le role aux sites listés, si vide = tous les sites
  @type.models({model: ThreeSiteModel})
  public siteIds: string[] = [];

  // pour limiter le role aux themes listés, si vide = tous les sites
  @type.models({model: ThreeThemeModel})
  public themeIds: string[] = [];

  // actions autorisées par ce groupes
  @type.array({type: 'select', options: actions})
  @validate.required
  public actions: action[] = [];

  @type.array({type: 'object', options: {
    keys: {
      userId: {type: 'model', options: {model: UserModel}, required: true},
      role: {type: 'select', options: {options: ['member', 'manager']}, required: true}
    },
    allowOtherKeys: false
  }})
  @validate.required
  public members: {userId: string, role: 'member' | 'manager'}[] = [];

  @type.boolean
  public isPublic: boolean = false;

  public static getMyRights(): Promise<ThreeUserRights> {
    return ThreeGroupModel.api.get('/three/current-user-rights').then(jsonify);
  }
}
