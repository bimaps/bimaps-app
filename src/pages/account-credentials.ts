import { inject} from 'aurelia-framework';
import { Global } from 'global';

@inject(Global)
export class AccountCredentials {    

  constructor(private global: Global) {
  }
}
