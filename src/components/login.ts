import { FastNext } from './next/index';
// Detect auto-fill: https://medium.com/@brunn/detecting-autofilled-fields-in-javascript-aed598d25da7
import { inject, BindingEngine, bindable } from 'aurelia-framework'
import { Global } from 'global';
import { getLogger } from 'aurelia-logging';
import { Subscription } from 'aurelia-event-aggregator';
import PhoneNumber from 'awesome-phonenumber';
import { errorify, notify } from 'aurelia-resources';
import { SdLogin } from 'aurelia-deco';
import settings from '../settings';
import { EventAggregator } from 'aurelia-event-aggregator';
import { TextField } from '@microsoft/fast-foundation';
import * as moment from 'moment';
const log = getLogger('login');

@inject(Element, Global, BindingEngine, SdLogin, EventAggregator)
export class Login {

  @bindable public routeNext: string = 'account';
  @bindable public routeParams: any = {};

  public loginWith: 'email' | 'mobile' = 'email';

  public countriesList = settings.countries;
  public nextElement: FastNext;
  private step: 'welcome' | 'mobile' | 'validation' | 'identity' | 'finish' = 'welcome';
  private mobile = '';
  public mobilePlaceholder = '';
  private regionCode = 'ch';
  private isMobileValid = false;
  private email = '';
  public emailPlaceholder = 'example@domain.com';
  private isEmailValid = false;
  private password = '';
  private isPasswordValid = false;
  private countryCode: number;
  private validationCode = '';
  public isValidationCodeValid = false;
  private resetPasswordCode = '';
  public isResetPasswordCodeValid = false;
  public suggestAccountCreation = false;
  
  private invalidCode = false;
  private firstname = '';
  private lastname = '';
  public preview: string;
  private extraData: any;

  private token: string;
  private userId: string;
  
  private loading = false;


  private subscriptions: Subscription[] = [];

  constructor(private element: Element, private global: Global, private bindingEngine: BindingEngine, private sdLogin: SdLogin, private eventAggregator: EventAggregator) {
    this.eventAggregator.publish('request-icon-loading', 'AtSymbol');
    this.eventAggregator.publish('request-icon-loading', 'Key');
    this.eventAggregator.publish('request-icon-loading', 'Check');
  }

  public attached(): void {
    this.regionCode = this.global.state?.country?.toLowerCase() || 'ch';
    this.countryChanged();
    this.fetchQueryStringData();
    this.listenForAutoFill();
  }

  public listenForAutoFill(): void {
    const fields = this.element.querySelectorAll('ecos-text-field-login:not(.autofill-listener-ready)');
    for (let index = 0; index < fields.length; index++) {
      const field = fields.item(index);
      field.addEventListener('animationstart', () => {
        const f: any = field;
        field.setAttribute('value', f.value);
        const input = field.querySelector('input');
        if (input) {
          input.value = f.value;
          input.dispatchEvent(new CustomEvent('keyup', {bubbles: true}));
        }
      });
      field.classList.add('autofill-listener-ready');
    }
  }

  public async fetchQueryStringData(): Promise<void> {
    const search = location.search;
    if (search && search.substr(0, 1) === '?') {
      const searchParts = search.substr(1).split('&');
      let token = '';
      let code = '';
      let tokenExpiry = '';
      for (const part of searchParts) {
        const keyValue = part.split('=');
        const key = keyValue[0];
        const value = keyValue[1];
        if (key === 'step' && value === 'create-account') {
          setTimeout(() => {
            this.startCreatingAnAccount();
          }, 350);
        }
        if (key === 'f') {
          this.firstname = decodeURIComponent(value);
        }
        if (key === 'l') {
          this.lastname = decodeURIComponent(value);
        }
        if (key === 'e' && value) {
          this.email = decodeURIComponent(value);
        }
        if (key === 'm' && value) {
          this.mobile = decodeURIComponent(value);
        }
        if (key === 'tk' && value) {
          token = decodeURIComponent(value);
        }
        if (key === 'exp' && value) {
          tokenExpiry = decodeURIComponent(value);
        }
        if (key === 'c' && value) {
          code = decodeURIComponent(value);
        }
        if (key === 'extra') {
          try {
            this.extraData = JSON.parse(atob(value));
          } catch (error) {
            this.extraData = value;
          }
        }
        location.search.replace(part, '');
        if (token && tokenExpiry && code) {

          this.clearCreateAccountMemory();
          // check if token is valid
          await this.global.store.dispatch('sd-login-validateAccountStep', token, tokenExpiry);
          try {
            await this.sdLogin.validateCode(code, this.loginWith);
            notify('login.Your account has been validated');
            return;
          } catch (error) {
            errorify(error);
          }
        }
      }
    }
    this.fetchCreateAccountMemory();
    this.continueFromCreateAccountMemory();
  }

  public scrollNextContentToTop(event: CustomEvent): void {
    const elementOrElementId = event.detail as string | HTMLElement;
    const element: HTMLElement = typeof elementOrElementId === 'string' ? document.getElementById(elementOrElementId) : elementOrElementId;
    element.scrollTo({top: 0, behavior: 'smooth'});
    document.scrollingElement.scrollTo({top: 0, behavior: 'smooth'});
  }

  public async countryChanged(): Promise<void> {
    this.countryCode = PhoneNumber.getCountryCodeForRegionCode(this.regionCode);
    this.mobilePlaceholder = PhoneNumber.getExample(this.regionCode).getNumber('national');
    this.mobileChanged();
    await this.global.store.dispatch('setCountry', this.regionCode.toUpperCase());
  }

  public countryCodeNumber(regionCode: string): number {
    return PhoneNumber.getCountryCodeForRegionCode(regionCode);
  }

  public mobileChanged(): void {
    this.isMobileValid = new PhoneNumber(this.mobile, this.regionCode).isValid();
  }

  public emailChanged(): void {
    this.isEmailValid = isEmail(this.email);
  }
  
  public passwordChanged(performValidation: boolean): void {
    this.isPasswordValid = this.password.length >= 8 || !performValidation;
  }
  
  public validationCodeChanged(preventAutoValidation = false): void {
    if (this.validationCode.length === 6 && !preventAutoValidation) {
      this.validateAccount(null, false);
    }
    this.isValidationCodeValid = this.validationCode.length === 6;
  }

  public resetPasswordCodeChanged(): void {
    this.isResetPasswordCodeValid = this.resetPasswordCode.length === 6;
  }

  public detached(): void {
    for (const sub of this.subscriptions) {
      sub.dispose();
    }
    this.subscriptions = [];
  }


  public async processIdentity(event: Event | null, manuallyRequested = true): Promise<void> {
    if (event) {
      event.preventDefault();
    }
    this.email = this.email.trim();
    this.mobile = this.mobile.trim();
    if (this.loginWith === 'mobile' && !this.isMobileValid) {
      errorify(new Error('Invalid mobile number'));
      return;
    }

    if (this.loginWith === 'email' && !this.isEmailValid) {
      errorify(new Error('Invalid email'));
      return;
    }

    if (this.loading) {
      return;
    }

    const username = this.loginWith === 'mobile' ? new PhoneNumber(this.mobile, this.regionCode)?.getNumber() : this.email;
    this.loading = true;
    try {
      const exists = await this.sdLogin.checkIfUsernameExists(username);
      
      if (!exists) {
        if (manuallyRequested) {
          this.suggestAccountCreation = true;
        }
      } else if (exists === this.loginWith) {
        this.suggestAccountCreation = false;
        this.nextElement.goToId('login-with-password');
        setTimeout(() => {
          const input = document.querySelector('ecos-next-item#login-with-password ecos-text-field-login input');
          if (input instanceof HTMLInputElement) {
            input.focus();
          }
        }, 600);
        this.clearCreateAccountMemory();
      }
      this.listenForAutoFill();
    } catch (error) {
      errorify(error);
    }
    this.loading = false;
  }

  public startCreatingAnAccount(emptyUsername = true, event?: Event): void | false {
    if (event) {
      event.stopPropagation();
    }
    if (emptyUsername) {
      this.email = '';
      this.mobile = '';
    }
    this.nextElement.goToId('name');
    setTimeout(() => {
      const input = document.querySelector('ecos-next-item#name ecos-text-field');
      if (input instanceof TextField) {
        const shadowedInput = input.shadowRoot.querySelector('input');
        if (input) {
          shadowedInput.focus();
        }
      }
    }, 600)
    this.suggestAccountCreation = false;
    if (event) {
      return false;
    }
  }

  public continueCreatingAnAccount(event: Event | null): void {
    if (event) {
      event.preventDefault();
    }
    this.nextElement.goToId('create-account');
    setTimeout(() => {
      const input = document.querySelector('ecos-next-item#create-account ecos-text-field-login input');
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    }, 600);
    this.saveCreateAccountMemory();
  }

  public async requestValidationCode(event: Event | null): Promise<void> {
    if (event) {
      event.preventDefault();
    }

    if (this.loading) {
      return;
    }

    const username = this.loginWith === 'mobile' ? new PhoneNumber(this.mobile, this.regionCode)?.getNumber() : this.email;
    this.loading = true;
    try {
      this.sdLogin.passwordStrengthRequired = 'weak';
      const createAccountToken = await this.sdLogin.createAccount(
        this.firstname || '-', 
        this.lastname || '-',
        this.loginWith === 'email' ? username : '',
        this.loginWith === 'mobile' ? username : '',
        this.password,
        this.loginWith === 'email', this.loginWith === 'mobile',
        this.extraData);
      this.validationCode = '';
      this.nextElement.goToId('validate-account');
      setTimeout(() => {
        const input = document.querySelector('ecos-next-item#validate-account ecos-text-field-login input');
        if (input instanceof HTMLInputElement) {
          input.focus();
        }
      }, 600);
      this.saveCreateAccountMemory(this.sdLogin.state.sdlogin.createAccountValidationToken, this.sdLogin.state.sdlogin.createAccountValidationTokenExpiry);
    } catch  (error) {
      errorify(error);
    }
    this.loading = false;
  }

  private validating = false;
  private validated = false;
  public async validateAccount(event: Event | null, manuallyRequested = true): Promise<void> {
    if (event) {
      event.preventDefault();
    }
    if (this.loading || this.validating) {
      return;
    }

    if (manuallyRequested) {
      this.loading = true;
    }
    this.validating = true;
    try {
      await this.sdLogin.validateCode(this.validationCode, this.loginWith);
      this.validated = true;
      notify('login.Your account has been validated');
      
      if (this.password) {
        // if the user did not refresh, we have the password in memory and can login
        const username = this.loginWith === 'mobile' ? new PhoneNumber(this.mobile, this.regionCode)?.getNumber() : this.email;
        await this.sdLogin.login(username, this.password);
        setTimeout(() => {
          this.afterLogin();
        }, 500);
      } else {
        notify('login.You can now login with the password you choose earlier');
        await this.processIdentity(null, false);
      }
      this.clearCreateAccountMemory();

    } catch  (error) {
      if (manuallyRequested) {
        this.invalidCode = true;
        errorify(error);
      }
    }
    this.loading = false;
    this.validating = false;
  }

  public async loginWithPassword(event: Event | null): Promise<void> {
    if (event) {
      event.preventDefault();
    }

    if (this.loading) {
      return;
    }

    this.loading = true;
    try {
      const username = this.loginWith === 'mobile' ? new PhoneNumber(this.mobile, this.regionCode)?.getNumber() : this.email;
      await this.sdLogin.login(username, this.password);
      this.afterLogin();
    } catch  (error) {
      errorify(error);
    }
    this.loading = false;
  }

  public async forgotPassword(): Promise<void> {

    if (this.loading) {
      return;
    }

    this.loading = true;
    try {
      const username = this.loginWith === 'mobile' ? new PhoneNumber(this.mobile, this.regionCode)?.getNumber() : this.email;
      await this.sdLogin.requestResetPassword(username);
      this.nextElement.goToId('reset-password');
      setTimeout(() => {
        const input = document.querySelector('ecos-next-item#reset-password ecos-text-field-login input');
        if (input instanceof HTMLInputElement) {
          input.focus();
        }
      }, 600);
      this.resetPasswordCode = '';
    } catch  (error) {
      errorify(error);
    }
    this.loading = false;
  }

  public async resetPassword(event: Event | null): Promise<void> {
    if (event) {
      event.preventDefault();
    }

    if (this.loading) {
      return;
    }

    this.loading = true;
    try {
      await this.sdLogin.resetPassword(this.resetPasswordCode, this.password);
      this.password = '';
      this.backToLogin();
    } catch  (error) {
      errorify(error);
    }
    this.loading = false;
  }

  public backToLogin(): void {
    this.nextElement.goToId('identity');
    setTimeout(() => {
      const input = document.querySelector('ecos-next-item#identity ecos-text-field-login input');
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    }, 600);
  }

  public afterLogin(): void {
    setTimeout(() => {
      this.global.navigateToRoute(this.routeNext, this.routeParams);
    }, 150);
  }

  private createAccountMemory: {
    firstname?: string;
    lastname?: string;
    username?: string;
    regionCode?: string;
    token?: string;
    tokenExpiry?: string;
    extraData?: any
  } = {};
  private saveCreateAccountMemory(token?: string, tokenExpiry?: string) {
    this.createAccountMemory.firstname = this.firstname;
    this.createAccountMemory.lastname = this.lastname;
    this.createAccountMemory.username = this.loginWith === 'mobile' ? this.mobile : this.email;
    this.createAccountMemory.regionCode = this.regionCode;
    this.createAccountMemory.token = token || undefined;
    this.createAccountMemory.tokenExpiry = tokenExpiry ? moment(tokenExpiry).toString() : undefined;
    this.createAccountMemory.extraData = this.extraData;
    const string = btoa(JSON.stringify(this.createAccountMemory));
    localStorage.setItem('gs-cam', string);
  }

  private fetchCreateAccountMemory() {
    const cam = localStorage.getItem('gs-cam');
    if (cam) {
      try {
        this.createAccountMemory = JSON.parse(atob(cam));
        if (this.createAccountMemory.tokenExpiry) {
          const expires = moment(this.createAccountMemory.tokenExpiry);
          if (expires.isAfter(moment())) {
            this.createAccountMemory.token = undefined;
            this.createAccountMemory.tokenExpiry = undefined;
          }
        }
      } catch (error) {}
    }
  }

  private clearCreateAccountMemory(keepIdentity = true) {
    this.createAccountMemory = {};
    this.firstname = '';
    this.lastname = '';
    if (!keepIdentity) {
      this.email = '';
      this.mobile = '';
    }
    this.password = '';
    this.token = '';
    this.sdLogin.store.dispatch('sd-login-validateAccountStep', '', '');
    if (keepIdentity) {
      this.saveCreateAccountMemory('', '');
    } else {
      localStorage.removeItem('gs-cam');
    }
  }

  private async continueFromCreateAccountMemory() {
    if (!this.createAccountMemory.username) {
      return;
    }
    if (this.createAccountMemory.regionCode) {
      this.regionCode = this.createAccountMemory.regionCode;
    }
    if (this.loginWith === 'email' && isEmail(this.createAccountMemory.username)) {
      this.email = this.createAccountMemory.username;
      this.emailChanged();
    } else if (this.loginWith === 'mobile' && new PhoneNumber(this.mobile, this.regionCode)?.isValid()) {
      this.mobile === this.createAccountMemory.username;
      this.mobileChanged();
    } else {
      return false;
    }

    if (this.createAccountMemory.firstname) {
      this.firstname = this.createAccountMemory.firstname;
    }
    if (this.createAccountMemory.lastname) {
      this.lastname = this.createAccountMemory.lastname;
    }
    if (this.createAccountMemory.extraData) {
      this.extraData = this.createAccountMemory.extraData;
    }

    if (this.createAccountMemory.token) {
      await this.sdLogin.store.dispatch('sd-login-validateAccountStep', this.createAccountMemory.token, this.createAccountMemory.tokenExpiry);
      this.nextElement.goToId('validate-account');
      setTimeout(() => {
        const input = document.querySelector('ecos-next-item#validate-account ecos-text-field-login input');
        if (input instanceof HTMLInputElement) {
          input.focus();
        }
      }, 600);
    } else if (this.firstname || this.lastname) {
      await this.processIdentity(new CustomEvent('none'), false);
    }
  }

  
}

function isEmail(value: string): boolean {
  if (typeof value === 'string') {
    if (value.match(/^[a-zA-Z](.*)/g)) {
      // username starts with a letter
      return true;
    }
    if (value.indexOf('@') !== -1) {
      // username contains the @ symbol
      return true;
    }
    return false;
  }
  return false;
}
