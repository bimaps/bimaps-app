import { inject } from 'aurelia-framework'
import { Global } from 'global';

@inject(Global)
export class LoginPage {

  public routeNext: string = 'account';
  public routeParams: any = {};

  constructor(private global: Global) {
    
  }

  public activate(params: any) {
    if (params?.t) {
      this.routeNext = params.t;
    } else {
      this.routeNext = 'account';
    }
    if (params?.p) {
      try {

        this.routeParams = JSON.parse(atob(params.p));
        if (typeof this.routeParams !== 'object') {
          throw new Error('');
        }
      } catch (error) {
        this.routeParams = {};
      }
    }
  }

}
