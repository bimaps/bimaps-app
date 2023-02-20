import { FastIcon } from './components/icon';
import { Observable } from '@microsoft/fast-element';

FastIcon.defaultSize = 'xl';
FastIcon.defaultWeight = 1.6;

export interface AureliaFastIconLoaderElement {
  iconName: string;
  outlineModule: Promise<any>,
  solidModule: Promise<any>,
}

export class AureliaFastIconLoader {
  public constructor() {
  }

  //public async load(icon: AureliaFastIconLoaderElement): Promise<void>
  //public async load(icon: AureliaFastIconLoaderElement[]): Promise<void>
  public async load(icon: string | AureliaFastIconLoaderElement | AureliaFastIconLoaderElement[], outlineModule?: Promise<any>, solidModule?: Promise<any>): Promise<void>  {
    if (Array.isArray(icon)) {
      for (const i of icon) {
        this.load(i);
      }
      return;
    }
    if (typeof icon === 'string') {
      icon = {
        iconName: icon,
        outlineModule: outlineModule,
        solidModule: solidModule
      }
    }
    if (icon.outlineModule) {
      this.loadIn(icon.iconName, icon.outlineModule, 'outline');
    }
    if (icon.solidModule) {
      this.loadIn(icon.iconName, icon.solidModule, 'solid');
    }
  
  }

  private async loadIn(iconName: string, module: Promise<any>, variant: 'outline' | 'solid'): Promise<void> {
    return module.then((mod) => {
      if (typeof mod.default === 'string') {
        FastIcon[variant][iconName] = mod.default;
        Observable.notify(FastIcon, variant);
      } else {
        throw new Error('Invalid icon module');
      }
    }).catch((error) => {
      console.warn('Error while loading icon', iconName, variant);
      console.error(error);
    });
  }
}
