import { inject} from 'aurelia-framework';
import { Global } from 'global';
import { UserModel, ProfileModel, ProfileHelper } from 'aurelia-deco';
import { countries } from 'aurelia-resources';
import { errorify, notify } from 'aurelia-resources';
import { UxModalService } from '@aurelia-ux/modal';

@inject(Global, UxModalService)
export class AccountProfile {    

  editingUserInstance: UserModel;
  editingProfileInstance: ProfileModel;
  countries = countries;

  public userHasChanged = false;
  
  constructor(private global: Global, private modalService: UxModalService) {
    
  }

  public async attached() {
    await ProfileHelper.getCurrentProfile();
    this.editingProfileInstance = ProfileHelper.getEditingInstance();
    this.editingUserInstance = ProfileHelper.getEditingUserInstance();
    if (!this.editingProfileInstance || !this.editingUserInstance) {
      errorify(new Error('Error when loading profile'));
      this.global.navigateToRoute('home');
    }
  }

  public async updateProfile(): Promise<void> {
    let promises: Array<Promise<any>> = [];
    promises.push(this.editingProfileInstance.updateProperties('', ['picture', 'street', 'zip', 'city', 'country']));
    if (this.userHasChanged) {
      promises.push(this.editingUserInstance.updateProperties('', ['firstname', 'lastname']));
    }
    Promise.all(promises).then(() => {
      let promises2: Array<Promise<any>> = [];
      promises2.push(this.global.swissdataApi.setCurrentUser());
      promises2.push(ProfileHelper.getCurrentProfile())
      return Promise.all(promises);
    }).then(() => {
      this.userHasChanged = false;
      notify('Your profile has been updated');
    }).catch(errorify);
  }
  
}
