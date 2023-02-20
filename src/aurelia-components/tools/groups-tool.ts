import { ConfirmDialog } from './../../components/dialogs/confirm';
import { ThreeThemeModel } from './../../models/theme.model';
import { UserModel } from 'aurelia-deco';
import { DomHelpers } from './../../helpers/dom';
import { ThreeGroupModel } from './../../models/group.model';
import { BaseTool } from './base-tool';
import { EventAggregator } from 'aurelia-event-aggregator';
import { inject } from 'aurelia-framework';
import { Three } from '../three';
import { ThreeSiteModel } from '../../internal';
import { Dialog } from '@microsoft/fast-foundation';
import { Global } from '../../global';
import { Rights } from '../rights';

@inject(EventAggregator, Three, Global, Rights)
export class GroupsTool extends BaseTool {

  private sites: ThreeSiteModel[] = [];
  private groups: ThreeGroupModel[] = [];
  private themes: ThreeThemeModel[] = [];
  private users: UserModel[] = [];
  private selectedGroup: ThreeGroupModel;

  private restrictGroupToSites = false;
  private restrictGroupToThemes = false;

  private usersSelector: Dialog;

  private isFullScreen = false;

  constructor(eventAggregator: EventAggregator, private three: Three, private global: Global, private rights: Rights) {
    super(eventAggregator);
    this.hoverBoxPosition = 'next-toolbar';
  }

  public attached(): void {
    super.attached();
    this.fetchSites();
    this.fetchGroups();
    this.fetchThemes();
    this.fetchUsers();
  }

  public detached(): void {
    super.detached();
  }

  public enableFullScreen(): void {
    if (this.isFullScreen) {
      return;
    }
    DomHelpers.moveToBody(this.panel);
    this.isFullScreen = true;
  }

  public disableFullScreen(): void {
    if (!this.isFullScreen) {
      return;
    }
    DomHelpers.restoreFromBody(this.panel);
    this.isFullScreen = false;
  }

  private async fetchSites(): Promise<void> {
    this.sites = await ThreeSiteModel.getAll();
  }

  private async fetchGroups(): Promise<void> {
    this.groups = await ThreeGroupModel.getAll();
  }

  private async fetchThemes(): Promise<void> {
    this.themes = await ThreeThemeModel.getAll();
  }

  private async fetchUsers(): Promise<void> {
    this.users = await UserModel.getAll();
  }

  public editGroup(groupId: string) {
    const group = this.groups.find(s => s.id === groupId);
    if (group) {
      this.selectedGroup = group;
      this.restrictGroupToSites = Boolean(this.selectedGroup.siteIds?.length);
      this.restrictGroupToThemes = Boolean(this.selectedGroup.themeIds?.length);
    }
  }

  public unselectGroup(): void {
    if (this.selectedGroup) {
      this.selectedGroup = undefined;
      this.disableFullScreen();
    }
  }

  public newGroup(): void {
    this.selectedGroup = new ThreeGroupModel();
    this.selectedGroup.name = 'New Group';
    this.restrictGroupToSites = false;
    this.restrictGroupToThemes = false;
    this.selectedGroup.members = [
      {userId: this.global.state.swissdata.user.id, role: 'manager'}
    ];
    this.selectedGroup.actions.splice(0, this.selectedGroup.actions.length);
    this.selectedGroup.actions.push('site_read');
  }

  public addUser(): void {
    this.openUsersSelector((selectedUser) => {
      if (!selectedUser) {
        return;
      }
      if (this.selectedGroup.members.find(m => m.userId === selectedUser.id)) {
        return;
      }
      this.selectedGroup.members.push({userId: selectedUser.id, role: 'member'});
    });
  }

  public async saveGroup(): Promise<void> {
    try {

      this.selectedGroup.siteIds = this.restrictGroupToSites ? this.selectedGroup.siteIds : [];
      this.selectedGroup.themeIds = this.restrictGroupToThemes ? this.selectedGroup.themeIds : [];

      if (!this.selectedGroup.id) {
        await this.selectedGroup.save();
      } else {
        await this.selectedGroup.updateProperties('', Object.keys(this.selectedGroup));
      }

      await this.fetchGroups();
    } catch (error) {
      console.error(error);
    }
  }

  public async deleteGroup(): Promise<void> {
    const response = await ConfirmDialog.renderModal({title: 'Are you sure ?', text: `You are about to completely and permanentely remove the "${this.selectedGroup.name}" group.`});
    if (response.wasDismissed) {
      return;
    }
    await this.selectedGroup.remove();
    await this.fetchGroups();
    this.unselectGroup();
  }

  
  private selectedUserCallback: ((selectedUser: UserModel | undefined) => void) | undefined = undefined;
  public openUsersSelector(callback: (selectedUser: UserModel | undefined) => void): void {
    this.selectedUserCallback = callback;
    DomHelpers.moveToBody(this.usersSelector);
    this.usersSelector.show();
  }
  
  public closeUsersSelector(selectedUser: UserModel | undefined): void {
    if (this.selectedUserCallback) {
      try {
        this.selectedUserCallback(selectedUser);
      } catch (error) {
        console.error(error);
        return
      }
      this.selectedUserCallback = undefined;
    } else {
      console.warn('No selectedUserCallback found');
    }
    this.usersSelector.hide();
    DomHelpers.restoreFromBody(this.usersSelector);
  }

  public userFullName(userId: string): string {
    const user = this.users.find(u => u.id === userId);
    return user ? `${user.firstname} ${user.lastname}` : '';
  }

  public hasThemeAction(actions: string[] = []): boolean {
    return Boolean(actions.find(a => (a === 'theme_read' || a === 'theme_write')));
  }
  
}
