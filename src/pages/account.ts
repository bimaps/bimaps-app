import { inject} from 'aurelia-framework';
import { Global } from 'global';
import { getLogger } from 'aurelia-logging';
import { ThreeSiteModel } from '../internal';

const log = getLogger('account');

@inject(Global)
export class Account {    

  public sites: Array<ThreeSiteModel> = [];

  constructor(private global: Global) {

  }

  public activate() {
    this.getSites();
  }

  public async getSites() {
    this.sites = await ThreeSiteModel.getAll();
  }



}
