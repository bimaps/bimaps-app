import { ThreeGroupModel, ThreeUserRights } from './../models/group.model';
import { inject, computedFrom } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';

@inject(EventAggregator)
export class Rights {

  private subs: Subscription[] = [];
  private myRights: ThreeUserRights | undefined = undefined;
  private fetchNb = 0;

  public constructor(private eventAggregator: EventAggregator) {
    this.setSuscribers();
    try {
      this.fetchMyRights();
    } catch (error) {
      this.myRights = undefined;
    }
  }

  private setSuscribers(): void {
    this.subs.push(this.eventAggregator.subscribe('swissdata:login', () => {
      this.fetchMyRights();
    }));
    this.subs.push(this.eventAggregator.subscribe('swissdata:logout', () => {
      this.myRights = undefined;
    }));
  }

  public disposeSubscribers(): void {
    for (const sub of this.subs) {
      sub.dispose();
    }
    this.subs = [];
  }

  private async fetchMyRights(): Promise<void> {
    this.myRights = await ThreeGroupModel.getMyRights();
    this.fetchNb++;
  }

  public getMyRights(): ThreeUserRights | undefined {
    return this.myRights;
  }

  @computedFrom('fetchNb')
  public get canWriteGroups(): boolean {
    const userRights = this.myRights;
    if (!userRights) {
      return false;
    }
    return userRights.allSites.group_write === true;
  }

  @computedFrom('fetchNb')
  public get canManageOneGroup(): boolean {
    if (this.canWriteGroups) {
      return true;
    }
    const userRights = this.myRights;
    if (!userRights) {
      return false;
    }
    return Array.isArray(userRights.allSites.group_manage) && userRights.allSites.group_manage?.length > 0;
  }

  @computedFrom('fetchNb')
  public get canWriteSites(): boolean {
    const userRights = this.myRights;
    if (!userRights) {
      return false;
    }
    return userRights.allSites.site_write === true;
  }

  public canWriteSite(siteId: string): boolean {
    const userRights = this.myRights;
    if (!userRights) {
      return false;
    }
    if (userRights.allSites.site_write === true) {
      return true;
    }
    return userRights[siteId]?.site_write;
  }

  @computedFrom('fetchNb')
  public get canWriteThemes(): boolean {
    const userRights = this.myRights;
    if (!userRights) {
      return false;
    }
    if (Object.keys(userRights).find(k => userRights[k].theme_write === true)) {
      // can access all themes at least in one site
      return true;
    }
    return false;
  }

  public canWriteTheme(themeId: string, siteId?: string): boolean {
    const userRights = this.myRights;
    if (!userRights) {
      return false;
    }
    if (userRights.allSites.theme_write === true) {
      return true;
    }
    if (siteId && userRights[siteId]) {
      if (userRights[siteId].theme_write === true) {
        return true;
      }
      const themesCanWrite = (Array.isArray(userRights[siteId].theme_write) ? userRights[siteId].theme_write : []) as string[];
      if (themesCanWrite.includes(themeId)) {
        return true;
      }
    }
    return false;
  }

  public canReadThemes(siteId?: string): boolean {
    if (this.canWriteThemes) {
      return true;
    }
    const userRights = this.myRights;
    if (!userRights) {
      return false;
    }
    if (Object.keys(userRights).find(k => userRights[k].theme_read === true)) {
      // can access all themes at least in one site
      return true;
    }
    if (siteId && userRights[siteId]) {
      if (userRights[siteId].theme_read !== false) {
        return true;
      }
    }
    return false;
  }

  public canReadTheme(themeId: string, siteId?: string): boolean {
    if (this.canWriteTheme(themeId, siteId)) {
      return true;
    }
    const userRights = this.myRights;
    if (!userRights) {
      return false;
    }
    if (Object.keys(userRights).find(k => userRights[k].theme_read === true)) {
      // can access all themes at least in one site
      return true;
    }
    if (siteId && userRights[siteId]) {
      if (userRights[siteId].theme_read === true) {
        return true;
      }
      const themesCanRead = (Array.isArray(userRights[siteId].theme_read) ? userRights[siteId].theme_read : []) as string[];
      if (themesCanRead.includes(themeId)) {
        return true;
      }
    }
    return false;
  }

  public canWriteSignages(siteId?: string): boolean {
    if (this.canWriteThemes) {
      return true;
    }
    const userRights = this.myRights;
    if (!userRights) {
      return false;
    }
    if (userRights.allSites.signage_write) {
      return true;
    }
    if (siteId && userRights[siteId]) {
      if (userRights[siteId].signage_write !== false) {
        return true;
      }
    }
    return false;
  }

  public canReadSignages(siteId?: string): boolean {
    if (this.canWriteSignages(siteId)) {
      return true;
    }
    const userRights = this.myRights;
    if (!userRights) {
      return false;
    }
    if (userRights.allSites.signage_read) {
      return true;
    }
    if (siteId && userRights[siteId]) {
      if (userRights[siteId].signage_read !== false) {
        return true;
      }
    }
    return false;
  }
}
