import { Global } from './global';
import { inject } from 'aurelia-framework';
import { Router, RouterConfiguration } from 'aurelia-router';
import { ArDrawer, addNotifyContainerAlias, setNotifyDefaults } from 'aurelia-resources';
import routes from './routes';
import settings from './settings';
import { AuthorizeStep } from 'aurelia-deco';
import { BaseApp } from 'base/base-app';
// import * as FastClick from 'fastclick';
import { StyleEngine } from '@aurelia-ux/core';
import { UxInputTheme } from '@aurelia-ux/input';
import { AureliaFastIconLoader } from './fast-icons';
import { accentPalette, baseLayerLuminance, fillColor, controlCornerRadius, SwatchRGB, PaletteRGB, typeRampBaseFontSize } from '@microsoft/fast-components';
import { parseColor } from '@microsoft/fast-colors';

@inject(Global, Router, StyleEngine, AureliaFastIconLoader)
export class App extends BaseApp {

  menuDrawer: ArDrawer;
  bottomDrawerExempleDrawer: ArDrawer;

  public toolbarTopOpened: boolean = false;
  public displayLogo: boolean = false;

  private handleResize: EventListener;

  constructor(private global: Global, private router: Router, private styleEngine: StyleEngine, public iconLoader: AureliaFastIconLoader) {
    super();
    this.handleResize = e => {
    };
    addNotifyContainerAlias('top', '.notify-top-host');
    addNotifyContainerAlias('bottom', '.notify-bottom-host');
    setNotifyDefaults({
      containerSelector: '.notify-top-host'
    });
    const inputTheme: UxInputTheme = {
      themeKey: "input",
      borderRadius: '0px'
    };
    this.styleEngine.applyTheme(inputTheme, document.body);
    document.documentElement.style.setProperty('--three-canvas-background', settings.three.canvasBackground);
    if (settings.three.displayLogo) this.displayLogo = true;
    this.initIcons();
  }

  public attached() {
    this.handleResize(null);
    window.addEventListener('resize', this.handleResize);
    // (FastClick as any).attach(document.body);

    baseLayerLuminance.withDefault(settings.fast.designTokens.baseLayerLuminance);
    typeRampBaseFontSize.withDefault('16px');
    // lineHeightRatio.withDefault(1.5);

    const fill = parseColor(settings.fast.designTokens.fillColor);
    fillColor.withDefault(SwatchRGB.create(fill.r, fill.g, fill.b));

    const base = parseColor(settings.fast.designTokens.accentPalette);
    const swatch = SwatchRGB.create(base.r, base.g, base.b);
    accentPalette.withDefault(PaletteRGB.create(swatch));
    controlCornerRadius.withDefault(settings.fast.designTokens.controlCornerRadius);

  }

  public detached() {
    window.removeEventListener('resize', this.handleResize);
  }

  configureRouter(config: RouterConfiguration) {
    AuthorizeStep.redirectUnauthenticatedTo = settings.defaultRoutes.unauthenticated;
    if (!(window as any).cordova) config.options.pushState = true;
    config.addAuthorizeStep(AuthorizeStep);
    config.map(routes);
  }

  private async initIcons(): Promise<void> {
    this.iconLoader.load('User', import('./icons/outline/User'), import('./icons/solid/User'));
    this.iconLoader.load('Pencil', import('./icons/outline/Pencil'), import('./icons/solid/Pencil'));
    this.iconLoader.load('Adjustments', import('./icons/outline/Adjustments'), import('./icons/solid/Adjustments'));
    this.iconLoader.load('ArrowNarrowLeft', import('./icons/outline/ArrowNarrowLeft'), import('./icons/solid/ArrowNarrowLeft'));
    this.iconLoader.load('ArrowNarrowRight', import('./icons/outline/ArrowNarrowRight'), import('./icons/solid/ArrowNarrowRight'));
    this.iconLoader.load('ArrowCircleRight', import('./icons/outline/ArrowCircleRight'), import('./icons/solid/ArrowCircleRight'));
    this.iconLoader.load('X', import('./icons/outline/X'), import('./icons/solid/X'));
    this.iconLoader.load('DotsHorizontal', import('./icons/outline/DotsHorizontal'), import('./icons/solid/DotsHorizontal'));
    this.iconLoader.load('DotsCircleHorizontal', import('./icons/outline/DotsCircleHorizontal'), import('./icons/solid/DotsCircleHorizontal'));
    this.iconLoader.load('ChevronLeft', import('./icons/outline/ChevronLeft'), import('./icons/solid/ChevronLeft'));
    this.iconLoader.load('ChevronRight', import('./icons/outline/ChevronRight'), import('./icons/solid/ChevronRight'));
    this.iconLoader.load('ChevronDown', import('./icons/outline/ChevronDown'), import('./icons/solid/ChevronDown'));
    this.iconLoader.load('ChevronUp', import('./icons/outline/ChevronUp'), import('./icons/solid/ChevronUp'));
    this.iconLoader.load('Calendar', import('./icons/outline/Calendar'), import('./icons/solid/Calendar'));
    this.iconLoader.load('Search', import('./icons/outline/Search'), import('./icons/solid/Search'));
    this.iconLoader.load('Home', import('./icons/outline/Home'), import('./icons/solid/Home'));
    this.iconLoader.load('VideoCamera', import('./icons/outline/VideoCamera'), import('./icons/solid/VideoCamera'));
    this.iconLoader.load('CloudDownload', import('./icons/outline/CloudDownload'), import('./icons/solid/CloudDownload'));
    this.iconLoader.load('InformationCircle', import('./icons/outline/InformationCircle'), import('./icons/solid/InformationCircle'));
    this.iconLoader.load('Scissors', import('./icons/outline/Scissors'), import('./icons/solid/Scissors'));
    this.iconLoader.load('CursorClick', import('./icons/outline/CursorClick'), import('./icons/solid/CursorClick'));
    this.iconLoader.load('CubeTransparent', import('./icons/outline/CubeTransparent'), import('./icons/solid/CubeTransparent'));
    this.iconLoader.load('Sparkles', import('./icons/outline/Sparkles'), import('./icons/solid/Sparkles'));
    this.iconLoader.load('Play', import('./icons/outline/Play'), import('./icons/solid/Play'));
    this.iconLoader.load('Pause', import('./icons/outline/Pause'), import('./icons/solid/Pause'));
    this.iconLoader.load('LocationMarker', import('./icons/outline/LocationMarker'), import('./icons/solid/LocationMarker'));
    this.iconLoader.load('FolderOpen', import('./icons/outline/FolderOpen'), import('./icons/solid/FolderOpen'));
    this.iconLoader.load('Folder', import('./icons/outline/Folder'), import('./icons/solid/Folder'));
    this.iconLoader.load('Selector', import('./icons/outline/Selector'), import('./icons/solid/Selector'));
    this.iconLoader.load('Ban', import('./icons/outline/Ban'), import('./icons/solid/Ban'));
    this.iconLoader.load('Eye', import('./icons/outline/Eye'), import('./icons/solid/Eye'));
    this.iconLoader.load('Minus', import('./icons/outline/Minus'), import('./icons/solid/Minus'));
    this.iconLoader.load('Cog', import('./icons/outline/Cog'), import('./icons/solid/Cog'));
    this.iconLoader.load('UserGroup', import('./icons/outline/UserGroup'), import('./icons/solid/UserGroup'));
    this.iconLoader.load('Plus', import('./icons/outline/Plus'), import('./icons/solid/Plus'));
    this.iconLoader.load('ColorSwatch', import('./icons/outline/ColorSwatch'), import('./icons/solid/ColorSwatch'));
    this.iconLoader.load('ArrowsExpand', import('./icons/outline/ArrowsExpand'), import('./icons/solid/ArrowsExpand'));
    this.iconLoader.load('Trash', import('./icons/outline/Trash'), import('./icons/solid/Trash'));
    this.iconLoader.load('MenuAlt4', import('./icons/outline/MenuAlt4'), import('./icons/solid/MenuAlt4'));
    this.iconLoader.load('Download', import('./icons/outline/Download'), import('./icons/solid/Download'));
    this.iconLoader.load('Flag', import('./icons/outline/Flag'), import('./icons/solid/Flag'));
    this.iconLoader.load('Filter', import('./icons/outline/Filter'), import('./icons/solid/Filter'));
    this.iconLoader.load('Check', import('./icons/outline/Check'), import('./icons/solid/Check'));
    this.iconLoader.load('AtSymbol', import('./icons/outline/AtSymbol'), import('./icons/solid/AtSymbol'));
    this.iconLoader.load('Translate', import('./icons/outline/Translate'), import('./icons/solid/Translate'));
    
    this.iconLoader.load('ArrowsCondense', import('./icons/custom/arrowsCondense'), import('./icons/custom/arrowsCondense'));
    this.iconLoader.load('Walking', import('./icons/custom/walking'), import('./icons/custom/walking'));
  }

}
