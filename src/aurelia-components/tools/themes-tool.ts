import { SelectDialog } from './../../components/dialogs/select';
import { ThreeSiteModel } from './../../models/site.model';
import { StyleDefinition } from './../styling/styling-service';
import { ThreeStyleModel } from './../../models/style.model';
import { ThreeThemeModel, StylingRule } from './../../models/theme.model';
import { DomHelpers } from './../../helpers/dom';
import { BaseTool } from './base-tool';
import { EventAggregator } from 'aurelia-event-aggregator';
import { inject, bindable } from 'aurelia-framework';
import { Three } from '../three';
import { Global } from '../../global';
import { Vector3 } from 'three';
import { FilePreviewOptions, FixBodyOptions, GetAllOptions, jsonify, Model, RemoveOptions, SaveOptions, UpdatePropertiesOptions, UxFileItem } from 'aurelia-deco';
import { ConfirmDialog } from 'components/dialogs/confirm';
import { Rights } from '../rights';
import * as environment from '../../../config/environment.json';

export interface ColorPallet {
  id: string;
  title: string;
  colors: string[];
}

export interface ThemesStylesPackage {
  transferDate: Date;
  transferHost: string;
  themes:  ThreeThemeModel[];
  styles: ThreeStyleModel[];
}

@inject(EventAggregator, Three, Global, Rights)
export class ThemesTool extends BaseTool {

  @bindable siteId: string;
  private keyValues: {[key: string]: (string | number | boolean)[]} | undefined = undefined;

  private activeTab = "themes";
  private themes: ThreeThemeModel[] = [];
  private styles: ThreeStyleModel[] = [];
  private selectedTheme: ThreeThemeModel;
  private selectedStyle: ThreeStyleModel;
  private styleActivelabel: boolean = false;
  private styleActiveIcon:  boolean = false;
  private defaultColorPallets: ColorPallet[] = [
     {id: "01",
      title: 'Palette 1',
      colors:["#a50026","#d73027","#f46d43","#fdae61","#fee090","#e0f3f8","#abd9e9","#74add1","#4575b4"]},
     {id: "02",
      title: 'Palette 2',
      colors:["#543005", "#8c510a", "#bf812d", "#dfc27d", "#f6e8c3", "#f5f5f5", "#c7eae5", "#80cdc1", "#35978f", "#01665e", "#003c30"]},
     {id: "03",
      title: 'Palette 3',
      colors:["#40004b", "#762a83", "#9970ab", "#c2a5cf", "#e7d4e8", "#f7f7f7", "#d9f0d3", "#a6dba0", "#5aae61", "#1b7837", "#00441b"]}
    ];
    // https://colorbrewer2.org/ or https://github.com/onury/invert-color 

  private styleModel = {
    id: null,
    name: 'New Style',
    visible: true,
    color: '#000000',
    colorByValue: ['#a50026', '#d73027'],
    colorByValueKey: 'label',
    image: null,
    opacity: 1,
    maxOpacity: 1,
    depthTest: true,
    renderOrder: 1,
    label: {
      visible: true,
      opacity: 1,
      key: 'label',
      template: 'label',
      backgroundColor: '#000000',
      textColor: '#000000',
      scale: 1,
      centroidMethod: 'default',
      position: {x: 1, y: 1, z: 1},
      positionKey: 'label',
    },
    icon: {
      visible: true,
      default: 'label',
      key: 'label',
      backgroundColor: '#000000',
      textColor: '#000000',
      scale: 1,
      centroidMethod: 'default',
      position: {x: 1, y: 1, z: 1},
      positionKey: 'label',
      opacity: 1,
      texture: null,
    }
  }

  private isFullScreen = false;

  constructor(eventAggregator: EventAggregator, private three: Three, private global: Global, private rights: Rights) {
    super(eventAggregator);
    this.hoverBoxPosition = 'next-toolbar';
    (window as any).themesTool = this;
  }

  public attached(): void {
    super.attached();
    this.init();
  }

  public init():void {
    this.fetchThemes();
    this.fetchStyles();
    this.subs.push(this.eventAggregator.subscribe('aurelia-three:themes:select', async (themeId: string) => {
      this.deactivateCurrentTheme();
      try {
        const theme = await ThreeThemeModel.getOneWithId(themeId);
        if (theme) {
          this.registerTheme(theme, true);
        }
      } catch (error) {
        // fail silently
      }
    }));
    this.subs.push(this.eventAggregator.subscribe('aurelia-three:themes:deactivate-current', async (themeId: string) => {
      this.deactivateCurrentTheme();
    }));
  }

  public detached(): void {
    super.detached();
  }

  public async siteIdChanged(): Promise<void> {
    this.keyValues = undefined;
    if (this.siteId) {
      try {
        this.keyValues = await ThreeSiteModel.api.get(`/three/site/${this.siteId}/key-values`).then(jsonify);
      } catch (error) {
        // fail silently
      }
    }
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

  private async fetchThemes(): Promise<void> {
    this.themes = await ThreeThemeModel.getAll();
  }

  private async fetchStyles(): Promise<void> {
    this.styles = await ThreeStyleModel.getAll();
  }
  
  private padTo2Digits(num: number) {
    return num.toString().padStart(2, '0');
  }

  private async exportThemesStyles() {
    let exportData = {} as ThemesStylesPackage;
    let themes = await ThreeThemeModel.getAll();
    let styles = await ThreeStyleModel.getAll();

    exportData.transferDate = new Date();
    exportData.transferHost = environment.swissdata.host;
    exportData.themes = themes;
    exportData.styles = styles;

    try {
        const transfertDate: string = [exportData.transferDate.getFullYear(), 
           this.padTo2Digits(exportData.transferDate.getMonth() + 1),
           this.padTo2Digits(exportData.transferDate.getDate()),
           this.padTo2Digits(exportData.transferDate.getHours()),
           this.padTo2Digits(exportData.transferDate.getMinutes()),].join('-');
        const content = JSON.stringify(exportData);
        const blob = new Blob([content], {type: 'octet/stream'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ThemesStylesPackage-' + transfertDate + '.json';
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    }
  }
  
  private async importThemesStyles() {

    // Load file
    try {
      const file = await this.promptFile('.json');
      if (file.name.substring(file.name.length - 5) === '.json') {
        let reader = new FileReader();
        reader.onload = (event) => {
          console.log('event', event);
          let themesStylesPackage = JSON.parse((event as any).target.result);
          this.importThemesStylesPackage(themesStylesPackage);
        };
        reader.readAsText(file, 'UTF-8');
      }
    } catch (error) {
      console.error(error);
    }

  }

  private async promptFile(accept: string): Promise<File> {
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('accept', `${accept}`);
    input.click();

    return new Promise((resolve, reject) => {
      input.addEventListener('change', () => {
        if (input.files && input.files.length === 1) {
          resolve(input.files[0])
        }
        reject(new Error('No valid file selected'));
      });
    });
  }

  private async importThemesStylesPackage(themesStylesPackage: ThemesStylesPackage): Promise<void> {
    try {

      // Styles importation
      let existingStyles = await ThreeStyleModel.getAll();
      let newStyles: ThreeStyleModel[] = [];
      for (const style of themesStylesPackage.styles) {
        // found if existing theme (with same name)
        let existingStyle: ThreeStyleModel = undefined;
        for (const exSt of existingStyles) {
          if (style.name == exSt.name) {
            existingStyle = exSt;
            break;
          }
        }

        if (existingStyle) { // update style
          this.selectedStyle = existingStyle;
        } else { // Create new theme
          this.selectedStyle = new ThreeStyleModel();
        }

        this.selectedStyle.name = style.name
        this.selectedStyle.visible = style.visible ? style.visible : null;
        this.selectedStyle.color = style.color ? style.color : null;
        this.selectedStyle.colorByValue = style.colorByValue ? style.colorByValue : null;
        this.selectedStyle.colorByValueKey = style.colorByValueKey ? style.colorByValueKey : null;
        this.selectedStyle.image = style.image ? style.image : null;
        this.selectedStyle.opacity = style.opacity ? style.opacity : null;
        this.selectedStyle.maxOpacity = style.maxOpacity ? style.maxOpacity : null;
        this.selectedStyle.depthTest = style.depthTest ? style.depthTest : null;
        this.selectedStyle.renderOrder = style.renderOrder ? style.renderOrder : null;
        this.selectedStyle.label = style.label ? style.label : null;
        this.selectedStyle.icon = style.icon ? style.icon : null;

        this.styleHasChanged = true;
        await this.saveStyle(false);

        
      }
      

      // Update reference ID in Themes by name
      let newExistingStyles = await ThreeStyleModel.getAll();
      if (newExistingStyles && themesStylesPackage?.themes && themesStylesPackage?.styles){
        for (const newExistStyle of newExistingStyles) {
          for (const importStyle of themesStylesPackage.styles) {    
            if (importStyle.name === newExistStyle.name && importStyle.id != newExistStyle.id ) {
              
              // Remplace in import Themes rules
              for (const importTheme of themesStylesPackage.themes) {
                if (importTheme.stylingRules) {
                  for (const sr of importTheme.stylingRules) {
                    if (sr.styles) {
                      let findId = sr.styles.find(s => s === importStyle.id);
                      if (findId) { // update ID in Theme : Replace imported ID by the Style saved in DB
                        let newIds : string[] = [];
                        for (const id of sr.styles) {
                          id === importStyle.id ? newIds.push(newExistStyle.id) : newIds.push(id);
                        }
                        sr.styles = newIds;
                      }
                    }
                  }
                }
              }

            }
          }
          
        }
      }
   
      // Themes importation
      let existingThemes = await ThreeThemeModel.getAll();
      let newThemes: ThreeThemeModel[] = [];
      for (const importTheme of themesStylesPackage.themes) {

        // found if existing theme (with same name)
        let existingTheme: ThreeThemeModel = undefined;
        for (const exth of existingThemes) {
          if (importTheme.name == exth.name) {
            existingTheme = exth;
            break;
          }
        }

        if (existingTheme) { // update theme
          this.selectedTheme = existingTheme;
        } else { // Create new theme
          this.selectedTheme = new ThreeThemeModel();
        }

        this.selectedTheme.name = importTheme.name
        this.selectedTheme.stylingRules = importTheme.stylingRules;
        this.editingTheme = true;
        this.themeHasChanged = true;
        await this.saveTheme();
      }


    } catch (error) {
      console.error(error);
    }

    this.init();

  }


  
  /** THEME AREA */

  private editingTheme = false;
  private themeHasChanged = false;

  private requestRegisterThemeTimeout: any;
  public requestRegisterTheme(theme: ThreeThemeModel, active?: boolean): void {
    if (this.requestRegisterThemeTimeout) {
      clearTimeout(this.requestRegisterThemeTimeout);
    }
    this.requestRegisterThemeTimeout = setTimeout(() => {
      this.registerTheme(theme, active);
    }, 100);
  }
  public async registerTheme(theme: ThreeThemeModel, active?: boolean): Promise<void> {
    if (active !== false) {
      this.deactivateCurrentTheme();
    }
    const name = `theme:${theme.id}`;
    const checkers = await theme.computeStylesForStylingManager();

    // here we check if there is a currently edited style that should
    // overwrite the style from the db

    if (this.selectedStyle && this.styleHasChanged) {
      for (const checker of checkers) {
        for (let index = 0; index < checker.definitions.length; index++) {
          const definition = checker.definitions[index];
          const def: (StyleDefinition & {id?: string}) = definition as (StyleDefinition & {id?: string});
          if (def.id === this.selectedStyle.id) {
            checker.definitions[index] = {...this.selectedStyle};
          }
        }
      }
    }

    this.three.stylingManager.registerStyle(name, checkers, 50, typeof active === 'boolean' ? active : true);
    this.requestStylingManagerApply();
  }
  public deactivateCurrentTheme(): void {
    const styles = this.three.stylingManager.getRegisteredStyles();
    for (const style of styles) {
      if (style.name.slice(0, 6) === 'theme:') {
        this.three.stylingManager.deactivateStyle(style.name);
      }
    }
  }
  public activateTheme(theme: ThreeThemeModel): void {
    this.deactivateCurrentTheme();
    const name = `theme:${theme.id}`;
    this.three.stylingManager.activateStyle(name);
    this.requestStylingManagerApply();
  }
  public deactivateTheme(theme: ThreeThemeModel): void {
    const name = `theme:${theme.id}`;
    this.three.stylingManager.deactivateStyle(name);
    this.requestStylingManagerApply();
  }
  public disposeTheme(theme: ThreeThemeModel): void {
    const name = `theme:${theme.id}`;
    this.three.stylingManager.disposeStyle(name);
    this.requestStylingManagerApply();
  }
  private async askToSaveThemeChanges(): Promise<void> {
    if (this.themeHasChanged) {
      const response = await ConfirmDialog.renderModal({
        title: 'Save Modification ?',
        text: `You have unsaved modification in the "${this.selectedTheme.name}" theme. Would you like to save now. If not, your current modifications will be lost.`,
        cancelButtonText: 'No',
        okButtonText: 'Yes'
      });
      if (response) {
        await this.saveTheme();
      } else {
        this.fetchThemes();
      }
    }
  }
  public async selectTheme(themeId: string) {
    await this.askToSaveThemeChanges();
    this.editingTheme = false;
    const theme = this.themes.find(s => s.id === themeId);
    if (theme) {
      this.selectedTheme = theme;
      this.registerTheme(this.selectedTheme, true);
    }
  }

  public async editTheme(themeId: string, event?: Event) {
    event?.stopPropagation();
    await this.selectTheme(themeId);
    this.editingTheme = true;
    this.themeHasChanged = false;
  }

  public async unselectTheme(): Promise<void> {
    if (this.selectedTheme) {
      await this.askToSaveThemeChanges();
      this.disposeTheme(this.selectedTheme);
      this.selectedTheme = undefined;
      this.editingTheme = false;
      this.themeHasChanged = false;
      this.disableFullScreen();
    }
  }

  public newTheme(): void {
    this.selectedTheme = new ThreeThemeModel();
    this.selectedTheme.name = 'New Theme';
    this.editingTheme = true;
    this.themeHasChanged = true;
  }

  public async saveTheme(): Promise<void> {
    try {
      if (!this.selectedTheme.id) {
        const createdTheme = await this.selectedTheme.save();
        this.requestRegisterTheme(createdTheme);
      } else {
        const updatedTheme = await this.selectedTheme.updateProperties('', Object.keys(this.selectedTheme));
        this.requestRegisterTheme(updatedTheme);
      }
      this.themeHasChanged = false;
      await this.fetchThemes();
    } catch (error) {
      console.error(error);
    }
  }

  public async deleteTheme(): Promise<void> {
    try {
      const response = await ConfirmDialog.renderModal({title: 'Are you sure ?', text: `You are about to completely and permanentely remove the "${this.selectedTheme.name}" theme.`});
      if (response.wasDismissed) {
        return;
      }
      this.disposeTheme(this.selectedTheme);
      this.themeHasChanged = false;
      await this.selectedTheme.remove();
      await this.fetchThemes();
      await this.unselectTheme();
    } catch (error) {
      console.error(error);
    }
  }

  public notifyChangeInTheme(): void {
    this.themeHasChanged = true;
    this.requestStylingManagerApply();
  }

  private requestStylingManagerApplyTimeout: any;
  public requestStylingManagerApply(): void {
    this.ensureIconObject();
    this.ensureLabelObject();
    if (this.requestStylingManagerApplyTimeout) {
      clearTimeout(this.requestStylingManagerApplyTimeout);
    }
    this.requestStylingManagerApplyTimeout = setTimeout(() => {
      this.three.stylingManager.apply();
    }, 100);
  }


  /* STYLING RULE AREA */
  private selectedStylingRule: StylingRule;
  private useAndOperatorInStylingRule = true;
  public addStylingRule(): void {
    if (!this.selectedTheme) {
      return;
    }
    const stylingRule: StylingRule = {
      conditions: [],
      conditionOperator: 'and',
      styles: [],
      applyToChildren: false
    };
    this.selectedTheme.stylingRules.push(stylingRule);
    this.notifyChangeInTheme();
    this.editStylingRule(stylingRule);
  }
  public editStylingRule(stylingRule: StylingRule): void {
    if (!this.selectedTheme) {
      return;
    }
    this.requestRegisterTheme(this.selectedTheme);
    this.selectedStylingRule = stylingRule;
    this.useAndOperatorInStylingRule = this.selectedStylingRule.conditionOperator === 'and';
  }
  public stylingOrderChanged(): void {
    this.notifyChangeInTheme();
  }
  public async deleteStylingRule(stylingRule: StylingRule): Promise<void> {
    if (!this.selectedTheme) {
      return;
    }
    const index = this.selectedTheme.stylingRules.findIndex(sr => sr === stylingRule);
    if (index) {
      this.selectedTheme.stylingRules.splice(index, 1);
      this.selectedStylingRule = undefined;
      this.notifyChangeInTheme();
    }
    await this.saveTheme();
  }
  public async saveStylingRule(): Promise<void> {
    this.selectedStylingRule.conditionOperator = this.useAndOperatorInStylingRule ? 'and' : 'or';
    await this.saveTheme();
  }
  public unselectStylingRule(): void {
    if (this.selectedStylingRule) {
      this.selectedStylingRule = undefined;
    }
  }
  public addConditionToStylingRule(): void {
    this.selectedStylingRule.conditions.push({
      key: '',
      operator: '=',
      value: ''
    });
    this.notifyChangeInTheme();
  }
  public removeConditionFromStylingRule(conditionIndex: number): void {
    this.selectedStylingRule.conditions.splice(conditionIndex, 1);
    this.notifyChangeInTheme();
  }
  public removeColorByValue(): void {
    this.selectedStyle.colorByValue = undefined;
    this.selectedStyle.colorByValueKey = undefined;
    this.notifyChangeInStyle();
  }
  public async openKeyListForCondition(index: number): Promise<void> {
    const condition = this.selectedStylingRule.conditions[index];
    if (!condition || !this.keyValues) {
      return;
    }
    const options = Object.keys(this.keyValues).map(k => {
      return {value: k, label: k};
    });
    const response = await SelectDialog.renderModal({title: 'Select a key', options});
    if (!response.wasDismissed) {
      condition.key = response.value;
    }
    this.notifyChangeInTheme();
  }
  public async openKeyListForColorKey(): Promise<void> {
    const options = Object.keys(this.keyValues).map(k => {
      return {value: k, label: k};
    });
    const response = await SelectDialog.renderModal({title: 'Select a key', options});
    if (!response.wasDismissed) {
      this.selectedStyle.colorByValueKey = response.value;
    }
    this.notifyChangeInStyle();
  }
  public async openValueListForCondition(index: number): Promise<void> {
    const condition = this.selectedStylingRule.conditions[index];
    if (!condition || !this.keyValues) {
      return;
    }
    const values = this.keyValues[condition.key];
    if (!values?.length) {
      return;
    }
    const options = values.map(k => {
      return {value: `${k}`, label: `${k}`};
    });
    const response = await SelectDialog.renderModal({title: 'Select a value', options});
    if (!response.wasDismissed) {
      condition.value = response.value;
    }
    this.notifyChangeInTheme();
  }
  public async addStyleToStylingRule(): Promise<void> {
    const options = this.styles.map(s => {
      return {value: s.id, label: s.name};
    });
    const response = await SelectDialog.renderModal({title: 'Select a style to add', options});
    if (response.wasDismissed) {
      return;
    }
    const newStyle = response.value;
    if (!newStyle || this.selectedStylingRule.styles.includes(newStyle)) {
      return;
    }
    this.selectedStylingRule.styles.push(newStyle);
    this.notifyChangeInTheme();
  }
  
  public async addStyleColorPallet(): Promise<void> {
    const options = this.defaultColorPallets.map(s => {
      return {value: s.id, label: s.title};
    });
    const response = await SelectDialog.renderModal({title: 'Select a pallet', options});
    if (response.wasDismissed) {
      return;
    }
    const newPallet : ColorPallet = this.defaultColorPallets.find(e => e.id === response.value);
    this.selectedStyle.colorByValue = newPallet.colors;
    this.notifyChangeInStyle();
  }

  public setConditionOperator(conditionIndex: number, operator: '=' | '<' | '>' | '!=' | '*'): void {
    this.selectedStylingRule.conditions[conditionIndex].operator = operator;
    this.notifyChangeInTheme();
  }
  public removeStyleFromStylingRule(style: string): void {
    const index = this.selectedStylingRule.styles.indexOf(style)
    if (index !== -1) {
      this.selectedStylingRule.styles.splice(index, 1);
      this.notifyChangeInTheme();
    }
  }
  public styleOrderChanged(): void {
    this.notifyChangeInTheme();
  }

  
  public styleNameFromStyleId(styleId: string): string {
    return this.styles.find(s => s.id === styleId)?.name || '';
  }


  // TODO: when deleting (removing) a style => make sure its removed from all themes using it

  /* STYLING AREA */
  private styleHasChanged = false;
  private affect = {
    visible: false,
    opacity: false,
    maxOpacity: false,
    color: false,
    colorByValue: false,
    depthTest: false,

    label: false,
    labelVisible: false,
    labelThreeD: false,
    labelOpacity: false,
    labelKey: false,
    labelTemplate: false,
    labelBackgroundColor: false,
    labelTextColor: false,
    labelScale: false,
    labelRotation: false,
    labelIsHorizontal: false,
    labelCentroidMethod: false,
    labelPosition: false,
    labelPositionKey: false,

    icon: false,
    iconVisible: false,
    iconOpacity: false,
    iconDefault: false,
    iconKey: false,
    iconBackgroundColor: false,
    iconTextColor: false,
    iconScale: false,
    iconCentroidMethod: false,
    iconPosition: false,
    iconPositionKey: false,

    geometryReplace: false,
    geometryDefault: false,
    geometryKey: false,
    geometryScale: false,
    geometryCentroidMethod: false,
    geometryPosition: false,
    geometryPositionKey: false,
    geometryRotation: false,
    geometryRotationKey: false

  };
  private labelPosition = {
    x: '',
    y: '',
    z: '',
  }
  private iconPosition = {
    x: '',
    y: '',
    z: '',
  }
  private geometryPosition = {
    x: '',
    y: '',
    z: '',
  }
  private geometryRotation = {
    x: '',
    y: '',
    z: '',
  }
  private async askToSaveStyleChanges(): Promise<void> {
    if (this.styleHasChanged) {
      const response = await ConfirmDialog.renderModal({
        title: 'Save Modification ?',
        text: `You have unsaved modification in the "${this.selectedStyle.name}" style. Would you like to save now. If not, your current modifications will be lost.`,
        cancelButtonText: 'No',
        okButtonText: 'Yes'
      });
      if (response) {
        await this.saveStyle(true);
      } else {
        this.fetchStyles();
      }
    }
  }
  public async editStyle(styleId: string): Promise<void> {
    // TODO: find out if a style has changes and ask the user if we should save the changes before to edit a theme
    const style = this.styles.find(s => s.id === styleId);
    if (style) {
      await this.askToSaveStyleChanges();
      this.selectedStyle = style;
      this.styleHasChanged = false;
      this.setAffect();
    }
  }
  public async newStyle(): Promise<void> {
    await this.askToSaveStyleChanges();
    const newStyle = new ThreeStyleModel();
    newStyle.name = 'New Style';
    this.selectedStyle = newStyle;
    this.styleHasChanged = true;
    await this.saveStyle(true);
    this.setAffect();
  }
  private setAffect(): void {
    this.affect.visible = typeof this.selectedStyle.visible === 'boolean';
    this.affect.opacity = typeof this.selectedStyle.opacity === 'number';
    this.affect.maxOpacity = typeof this.selectedStyle.maxOpacity === 'number';
    this.affect.color = typeof this.selectedStyle.color === 'string';
    this.affect.colorByValue =  typeof this.selectedStyle.color === 'string';

    this.affect.depthTest = typeof this.selectedStyle.depthTest === 'boolean';

    this.styleActivelabel = false;
    if (this.selectedStyle.label && Object.keys(this.selectedStyle.label).length != 0) {
      this.styleActivelabel = true;
    }
    this.affect.label = this.styleActivelabel;
    this.affect.labelVisible = typeof this.selectedStyle.label?.visible === 'boolean';
    this.affect.labelThreeD = typeof this.selectedStyle.label?.threeD === 'boolean';
    this.affect.labelOpacity = typeof this.selectedStyle.label?.opacity === 'number';
    this.affect.labelKey = typeof this.selectedStyle.label?.key === 'string';
    this.affect.labelTemplate = typeof this.selectedStyle.label?.template === 'string';
    this.affect.labelBackgroundColor = typeof this.selectedStyle.label?.backgroundColor === 'string';
    this.affect.labelTextColor = typeof this.selectedStyle.label?.textColor === 'string';
    this.affect.labelScale = typeof this.selectedStyle.label?.scale === 'number';
    this.affect.labelRotation = typeof this.selectedStyle.label?.rotation === 'number';
    this.affect.labelIsHorizontal = typeof this.selectedStyle.label?.isHorizontal === 'boolean';
    this.affect.labelCentroidMethod = typeof this.selectedStyle.label?.centroidMethod === 'string';
    this.affect.labelPositionKey = typeof this.selectedStyle.label?.positionKey === 'string';
    this.affect.labelPosition = this.selectedStyle.label?.position ?  true : false;
    if (this.selectedStyle.label?.position?.x) {
      this.labelPosition.x = this.selectedStyle.label?.position?.x.toString();
    }
    if (this.selectedStyle.label?.position?.y) {
      this.labelPosition.y = this.selectedStyle.label?.position?.y.toString();
    }
    if (this.selectedStyle.label?.position?.z) {
      this.labelPosition.z = this.selectedStyle.label?.position?.z.toString();
    }
    
    this.styleActiveIcon = false;
    if (this.selectedStyle.icon && Object.keys(this.selectedStyle.icon).length != 0) {
      this.styleActiveIcon = true;
    }
    this.affect.icon = this.styleActiveIcon;
    this.affect.iconVisible = typeof this.selectedStyle.icon?.visible === 'boolean';
    this.affect.iconOpacity = typeof this.selectedStyle.icon?.opacity === 'number';
    this.affect.iconKey = typeof this.selectedStyle.icon?.key === 'string';
    this.affect.iconDefault = typeof this.selectedStyle.icon?.default === 'string';
    this.affect.iconBackgroundColor = typeof this.selectedStyle.icon?.backgroundColor === 'string';
    this.affect.iconTextColor = typeof this.selectedStyle.icon?.textColor === 'string';
    this.affect.iconScale = typeof this.selectedStyle.icon?.scale === 'number';
    this.affect.iconCentroidMethod = typeof this.selectedStyle.icon?.centroidMethod === 'string';
    this.affect.iconPositionKey = typeof this.selectedStyle.icon?.positionKey === 'string';
    this.affect.iconPosition = this.selectedStyle.icon?.position ? true : false;
    if (this.selectedStyle.icon?.position?.x) {
      this.iconPosition.x = this.selectedStyle.icon?.position?.x.toString();
    }
    if (this.selectedStyle.icon?.position?.y) {
      this.iconPosition.y = this.selectedStyle.icon?.position?.y.toString();
    }
    if (this.selectedStyle.icon?.position?.z) {
      this.iconPosition.z = this.selectedStyle.icon?.position?.z.toString();
    }

    this.affect.geometryReplace = typeof this.selectedStyle.geometry?.replace === "boolean";
    this.affect.geometryDefault = typeof this.selectedStyle.geometry?.default === "string";
    this.affect.geometryKey = typeof this.selectedStyle.geometry?.key === "string";
    this.affect.geometryScale = typeof this.selectedStyle.geometry?.scale === "number";
    this.affect.geometryCentroidMethod = typeof this.selectedStyle.geometry?.centroidMethod === "string";
    this.affect.geometryPosition = typeof this.selectedStyle.geometry?.position ? true : false;
    if (this.selectedStyle.geometry?.position?.x) {
      this.geometryPosition.x = this.selectedStyle.geometry?.position?.x.toString();
    }
    if (this.selectedStyle.geometry?.position?.y) {
      this.geometryPosition.y = this.selectedStyle.geometry?.position?.y.toString();
    }
    if (this.selectedStyle.geometry?.position?.z) {
      this.geometryPosition.z = this.selectedStyle.geometry?.position?.z.toString();
    }

    this.affect.geometryPositionKey = typeof this.selectedStyle.geometry?.positionKey === "string";
    this.affect.geometryRotation = typeof this.selectedStyle.geometry?.rotation ? true : false;
    if (this.selectedStyle.geometry?.rotation?.x) {
      this.geometryRotation.x = this.selectedStyle.geometry?.rotation?.x.toString();
    }
    if (this.selectedStyle.geometry?.rotation?.y) {
      this.geometryRotation.y = this.selectedStyle.geometry?.rotation?.y.toString();
    }
    if (this.selectedStyle.geometry?.rotation?.z) {
      this.geometryRotation.z = this.selectedStyle.geometry?.rotation?.z.toString();
    }

    this.affect.geometryRotationKey = typeof this.selectedStyle.geometry?.rotationKey === "string";





    this.ensureLabelObject();
    this.ensureIconObject();
  }
  private enforceAffect(): void {
    this.selectedStyle.visible = this.affect.visible ? this.selectedStyle.visible : null;
    this.selectedStyle.opacity = this.affect.opacity ? parseFloat(`${this.selectedStyle.opacity}`) : null;
    this.selectedStyle.maxOpacity = this.affect.maxOpacity ? this.selectedStyle.maxOpacity : null;
    this.selectedStyle.color = this.affect.color ? this.selectedStyle.color : null;
    this.selectedStyle.colorByValue = this.affect.color ? this.selectedStyle.colorByValue : null;
    this.selectedStyle.colorByValueKey = this.affect.color ? this.selectedStyle.colorByValueKey : null;
    this.selectedStyle.depthTest = this.affect.depthTest ? this.selectedStyle.depthTest : null;

    this.selectedStyle.label = this.affect.label ? this.selectedStyle.label : null;
    if (this.selectedStyle.label) {
      this.selectedStyle.label.visible = this.affect.labelVisible ? this.selectedStyle.label.visible : null;
      this.selectedStyle.label.threeD = this.affect.labelThreeD ? this.selectedStyle.label.threeD : null;
      this.selectedStyle.label.opacity = this.affect.labelOpacity ? this.selectedStyle.label.opacity : null;
      this.selectedStyle.label.key = this.affect.labelKey ? this.selectedStyle.label.key : null;
      this.selectedStyle.label.template = this.affect.labelTemplate ? this.selectedStyle.label.template : null;
      this.selectedStyle.label.backgroundColor = this.affect.labelBackgroundColor ? this.selectedStyle.label.backgroundColor : null;
      this.selectedStyle.label.textColor = this.affect.labelTextColor ? this.selectedStyle.label.textColor : null;
      this.selectedStyle.label.scale = this.affect.labelScale ? this.selectedStyle.label.scale : null;
      this.selectedStyle.label.rotation = this.affect.labelRotation ? parseFloat(`${this.selectedStyle.label.rotation}`) : null;
      this.selectedStyle.label.isHorizontal = this.affect.labelIsHorizontal ? this.selectedStyle.label.isHorizontal : null;
      this.selectedStyle.label.centroidMethod = this.affect.labelCentroidMethod ? this.selectedStyle.label.centroidMethod : null;
      this.selectedStyle.label.position = this.affect.labelPosition ? this.selectedStyle.label.position : null;
      if (this.affect.labelPosition) {
        this.selectedStyle.label.position = new Vector3(parseFloat(this.labelPosition.x), parseFloat(this.labelPosition.y), parseFloat(this.labelPosition.z));
      }
    }

    this.selectedStyle.icon = this.affect.icon ? this.selectedStyle.icon : null;
    if (this.selectedStyle.icon) {
      this.selectedStyle.icon.visible = this.affect.iconVisible ? this.selectedStyle.icon.visible : null;
      this.selectedStyle.icon.opacity = this.affect.iconOpacity ? this.selectedStyle.icon.opacity : null;
      this.selectedStyle.icon.key = this.affect.iconKey ? this.selectedStyle.icon.key : null;
      this.selectedStyle.icon.default = this.affect.iconDefault ? this.selectedStyle.icon.default : null;
      this.selectedStyle.icon.backgroundColor = this.affect.iconBackgroundColor ? this.selectedStyle.icon.backgroundColor : null;
      this.selectedStyle.icon.textColor = this.affect.iconTextColor ? this.selectedStyle.icon.textColor : null;
      this.selectedStyle.icon.scale = this.affect.iconScale ? this.selectedStyle.icon.scale : null;
      this.selectedStyle.icon.centroidMethod = this.affect.iconCentroidMethod ? this.selectedStyle.icon.centroidMethod : null;
      this.selectedStyle.icon.position = this.affect.iconPosition ? this.selectedStyle.icon.position : null;
      if (this.affect.iconPosition) {
        this.selectedStyle.icon.position = new Vector3(parseFloat(this.iconPosition.x), parseFloat(this.iconPosition.y), parseFloat(this.iconPosition.z));
      }
    }
  }
  public async unselectStyle(): Promise<void> {
    // TODO: find out if a style has changes and ask the user if we should save the changes before to edit a theme
    if (this.selectedStyle) {
      await this.askToSaveStyleChanges();
      this.styleHasChanged = false;
      this.selectedStyle = undefined;
      this.disableFullScreen();
    }
  }
  public ensureLabelObject(): void {
    if (!this.selectedStyle) {
      return;
    }
    this.selectedStyle.label = this.selectedStyle.label || {};
  }
  public ensureIconObject(): void {
    if (!this.selectedStyle) {
      return;
    }
    this.selectedStyle.icon = this.selectedStyle.icon || {};
  }

  public async saveStyle(force: boolean): Promise<void> {
    if (force) this.enforceAffect();
    if (this.selectedStyle.id) {

      for (const o of Object.keys(this.selectedStyle)) {
        if (this.styleModel[o] && typeof this.styleModel[o] === 'number') {
          if (this.selectedStyle[o]) this.selectedStyle[o] = +this.selectedStyle[o];
        }
      }
      if (this.selectedStyle.label) {        
        for (const o of Object.keys(this.selectedStyle.label)) {
          if (this.styleModel?.label && this.styleModel.label[o] && typeof this.styleModel.label[o] === 'number') {
            if (this.selectedStyle.label[o]) this.selectedStyle.label[o] = +this.selectedStyle.label[o];
          }
        }
      }
      if (this.selectedStyle.icon) {
        for (const o of Object.keys(this.selectedStyle.icon)) {
          if (this.styleModel.icon[o] && typeof this.styleModel.icon[o] === 'number') {
            if (this.selectedStyle.icon[o]) this.selectedStyle.icon[o] = +this.selectedStyle.icon[o];
          }
        }
      }
      
      await this.selectedStyle.updateProperties('', ['name', 'visible', 'opacity', 'maxOpacity', 'color', 'colorByValue', 'colorByValueKey', 'depthTest', 'label', 'icon']);
      await this.fetchStyles();
      this.styleHasChanged = false;
    } else {
      const createdStyle = await this.selectedStyle.save();
      this.selectedStyle = createdStyle;
      this.styleHasChanged = false;
      await this.fetchStyles();
      this.editStyle(createdStyle);
    }
    this.requestStylingManagerApply();
  }

  public async deleteStyle(): Promise<void> {
    const removedId: string = this.selectedStyle.id;

    // Search Style in themes
    let themesFounded: string[] = [];
    if (this.themes) {
      for (const theme of this.themes) {
        if (theme.stylingRules) {
          for (const stylingRule of theme.stylingRules) {
            if (stylingRule.styles) {
              let findId = stylingRule.styles.find(s => s === removedId);
              if (findId) themesFounded.push(theme.name);
            }
          }
        }
      }
    }

    const themesName: string = themesFounded ? 'This style is included in these themes: ' + themesFounded.join(', ') + ' (It will be removed from these themes)': '';
    const response = await ConfirmDialog.renderModal({title: 'Are you sure ?', text: `You are about to completely and permanentely remove the "${this.selectedStyle.name}" style. ${themesName}`});
    if (response.wasDismissed) {
      return;
    }
    this.styleHasChanged = false;
    await this.selectedStyle.remove();
    await this.fetchStyles();
    this.unselectStyle();

    // Remove in existing Themes
    if (removedId && this.themes) {
      for (const theme of this.themes) {
        if (theme.stylingRules) {
          for (const stylingRule of theme.stylingRules) {
            if (stylingRule.styles) {
              let findId = stylingRule.styles.find(s => s === removedId);
              if (findId) {
                let newIds : string[] = [];
                for (const id of stylingRule.styles) {
                  if (id != removedId) newIds.push(id);
                }
                stylingRule.styles = newIds;
                this.selectedTheme = theme;
                await this.saveTheme();
              }
            }
          }
        }
      }
    }

    this.requestStylingManagerApply();
  }

  public async duplicateStyle(): Promise<void> {

    const style = this.selectedStyle;

    this.selectedStyle = new ThreeStyleModel();
    this.selectedStyle.name = style.name + " copy";
    this.selectedStyle.visible = style.visible ? style.visible : null;
    this.selectedStyle.color = style.color ? style.color : null;
    this.selectedStyle.colorByValue = style.colorByValue ? style.colorByValue : null;
    this.selectedStyle.colorByValueKey = style.colorByValueKey ? style.colorByValueKey : null;
    this.selectedStyle.image = style.image ? style.image : null;
    this.selectedStyle.opacity = style.opacity ? style.opacity : null;
    this.selectedStyle.maxOpacity = style.maxOpacity ? style.maxOpacity : null;
    this.selectedStyle.depthTest = style.depthTest ? style.depthTest : null;
    this.selectedStyle.renderOrder = style.renderOrder ? style.renderOrder : null;
    this.selectedStyle.label = style.label ? style.label : null;
    this.selectedStyle.icon = style.icon ? style.icon : null;

    this.styleHasChanged = true;
    await this.saveStyle(false);

  }
  
  public notifyChangeInStyle(key?: string, affectValue?: boolean): void {
    
    if (key === 'affect.visible') affectValue ? this.selectedStyle.visible = true : this.selectedStyle.visible = null;
    if (key === 'affect.opacity') affectValue ? this.selectedStyle.opacity : this.selectedStyle.opacity = null;
    if (key === 'affect.maxOpacity') affectValue ? this.selectedStyle.maxOpacity : this.selectedStyle.maxOpacity = null;
    if (key === 'affect.color') affectValue ? this.selectedStyle.color : this.selectedStyle.color = null;
    if (key === 'affect.depthTest') affectValue ? this.selectedStyle.depthTest = true : this.selectedStyle.depthTest = null;
    
    if (key === 'affect.labelVisible') affectValue ? this.selectedStyle.label.visible = true : this.selectedStyle.label.visible = undefined;
    if (key === 'affect.labelThreeD') affectValue ? this.selectedStyle.label.threeD = true : this.selectedStyle.label.threeD = undefined;
    if (key === 'affect.labelOpacity') affectValue ? this.selectedStyle.label.opacity : this.selectedStyle.label.opacity = null;
    if (key === 'affect.labelKey') affectValue ? this.selectedStyle.label.key : this.selectedStyle.label.key = null;
    if (key === 'affect.labelTemplate') affectValue ? this.selectedStyle.label.template : this.selectedStyle.label.template = null;
    if (key === 'affect.labelBackgroundColor') affectValue ? this.selectedStyle.label.backgroundColor : this.selectedStyle.label.backgroundColor = null;
    if (key === 'affect.labelTextColor') affectValue ? this.selectedStyle.label.textColor : this.selectedStyle.label.textColor = null;
    if (key === 'affect.labelScale') affectValue ? this.selectedStyle.label.scale : this.selectedStyle.label.scale = null;
    if (key === 'affect.labelRotation') affectValue ? this.selectedStyle.label.rotation : this.selectedStyle.label.rotation = null;
    if (key === 'affect.labelIsHorizontal') affectValue ? this.selectedStyle.label.isHorizontal = true : this.selectedStyle.label.isHorizontal = null;
    if (key === 'affect.labelPosition') affectValue ? this.selectedStyle.label.position : this.selectedStyle.label.position = null;
    if (key === 'affect.labelPositionKey') affectValue ? this.selectedStyle.label.positionKey : this.selectedStyle.label.positionKey = null;
    
    if (key === 'affect.iconVisible') affectValue ? this.selectedStyle.icon.visible = true : this.selectedStyle.icon.visible = undefined;
    if (key === 'affect.iconOpacity') affectValue ? this.selectedStyle.icon.opacity : this.selectedStyle.icon.opacity = null;
    if (key === 'affect.iconKey') affectValue ? this.selectedStyle.icon.key : this.selectedStyle.icon.key = null;
    if (key === 'affect.iconDefault') affectValue ? this.selectedStyle.icon.default : this.selectedStyle.icon.default = null;
    if (key === 'affect.iconBackgroundColor') affectValue ? this.selectedStyle.icon.backgroundColor : this.selectedStyle.icon.backgroundColor = null;
    if (key === 'affect.iconTextColor') affectValue ? this.selectedStyle.icon.textColor : this.selectedStyle.icon.textColor = null;
    if (key === 'affect.iconScale') affectValue ? this.selectedStyle.icon.scale : this.selectedStyle.icon.scale = null;
    if (key === 'affect.iconPosition') affectValue ? this.selectedStyle.icon.position : this.selectedStyle.icon.position = null;
    if (key === 'affect.iconPositionKey') affectValue ? this.selectedStyle.icon.positionKey : this.selectedStyle.icon.positionKey = null;


    this.affect.label = this.styleActivelabel;
    this.affect.icon = this.styleActiveIcon;

    this.selectedStyle.label = this.affect.label ? this.selectedStyle.label : null;
    this.selectedStyle.icon = this.affect.icon ? this.selectedStyle.icon : null;
  
    this.styleHasChanged = true;

    if (!this.selectedTheme && this.themes && this.themes.length > 0) this.selectedTheme = this.themes[0];
    if (this.selectedTheme && this.selectedTheme.stylingRules) {
      this.enforceAffect();
      this.requestRegisterTheme(this.selectedTheme, true);
    }
  }


  public async showInfo(helpContent: string): Promise<void> {

    let title: string =  '';
    let text: string = '';

    if (helpContent == 'themes.rule.conditions') {
      title = 'Help: Conditions rule';
      text = `
      You can use current "Key" :\n
      - Building name property : current.building\n
      - Level name property : current.level\n
      \n
      You can use dynamic variable in "Value" :\n
      - Variable for selected name building : #{BuildingName}\n
      - Variable for selected name level : #{LevelName}\n
      `;
    }

    const response = await ConfirmDialog.renderModal({
      title: title,
      text: text,
      dismissable: true,
      okOnly: true,
      okButtonText: 'OK'
    });
    if (response) {
    } else {
    }

  }
  
}
