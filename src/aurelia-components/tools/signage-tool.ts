import { SelectDialog } from './../../components/dialogs/select';
import { SignageToolDownloadPDF, Layout } from './signage-tool-download-pdf';
import { EditSignageItemDialog } from './dialogs/edit-signage-item';
import { AdjustTranslationRotationDialog } from './dialogs/adjust-translation-rotation';
import { SiteNavigatorTool } from './site-navigator-tool';
import { SiteManager } from './../site-manager';
import { ThreeSignageModel, SignageItem } from './../../models/signage.model';
import { ConfirmDialog } from './../../components/dialogs/confirm';
import { DomHelpers } from './../../helpers/dom';
import { BaseTool } from './base-tool';
import { EventAggregator } from 'aurelia-event-aggregator';
import { inject, bindable, bindingMode } from 'aurelia-framework';
import { Three } from '../three';
import { Global } from '../../global';
import { Rights } from '../rights';
import { CursorControls } from './../../controls/cursor-controls';
import { Object3D, BoxBufferGeometry, MeshBasicMaterial, Mesh, Scene, Vector2, Vector3, Intersection, Color } from 'three';

@inject(EventAggregator, Three, Global, Rights)
export class SignageTool extends BaseTool {
  
  @bindable({defaultBindingMode: bindingMode.toView}) private siteManager: SiteManager;
  @bindable siteNavigator: SiteNavigatorTool;

  public static IconsList: {label: string, value: string}[] = [];
  public static LayoutsList: Layout[] = [];
  public static Geometry = new BoxBufferGeometry(0.5, 0.5, 0.5);
  public static Material = new MeshBasicMaterial( {color: 0xff0000} );
  public static getObjectsOnSameLevel: (signage: ThreeSignageModel, siteManager: SiteManager) => string[] = () => [];
  public static getIconUrl: (iconValue: string) => string = () => '';

  private signages: ThreeSignageModel[] = [];
  private signagesObjects: Mesh[] = [];
  private signageHasChanged = false;
  private selectedSignage: ThreeSignageModel;
  private isFullScreen = false;
  private listenToCursor: false | 'create' | 'select' | 'move' = 'select';

  public layouts: {label: string, value: string}[] = [];

  constructor(eventAggregator: EventAggregator, private three: Three, private global: Global, private rights: Rights) {
    super(eventAggregator);
    this.hoverBoxPosition = 'next-toolbar';
    this.layouts = SignageTool.LayoutsList;
  }
  
  public attached(): void {
    super.attached();
    this.subs.push(this.eventAggregator.subscribe('aurelia-three:select-tool:changed', (active: boolean) => {
      if (active) {
        this.stopListeningCursor(false);
      } else {
        this.startListeningCursor('select');
      }
    }));
    this.subs.push(this.eventAggregator.subscribe('aurelia-three:site-navigator:select-storey', (storey: Object3D) => {
      this.fetchSignages();
    }));
    this.listenCursor();
  }
  
  public detached(): void {
    super.detached();
    // TODO: dispose listenToCursor
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

  public siteManagerChanged(): void {
    console.log('siteManager changed');
    this.fetchSignages();
  }

  private async fetchSignages(): Promise<void> {
    if (!this.siteManager?.siteId) {
      return;
    }
    this.disposeCurrentSignages();
    this.signages = await ThreeSignageModel.getAll(`?siteId=${this.siteManager.siteId}&storey=${this.siteNavigator.selectedLevelName}`);
    console.log('this.signages', this.signages);
    this.prepareSignageObjects();
  }

  private disposeCurrentSignages(): void {
    for (const object of this.signagesObjects) {
      object.removeFromParent();
    }
    this.signagesObjects = [];
  }

  private prepareSignageObjects(): void {
    this.disposeCurrentSignages();
    for (const signage of this.signages) {
      signage.position.x = Math.round(signage.position.x * 1000) / 1000;
      signage.position.y = Math.round(signage.position.y * 1000) / 1000;
      signage.position.z = Math.round(signage.position.z * 1000) / 1000;

      const layout = SignageTool.LayoutsList.find(l => l.value === signage.layout);
      const color = layout?.color || '#ff0000';
      const material = SignageTool.Material.clone();
      material.color = new Color(color);

      const object = new Mesh(SignageTool.Geometry, material);
      object.position.set(
        signage.position.x, 
        signage.position.y, 
        signage.position.z,
      );
      object.userData = {
        signageId: signage.id,
        building: signage.building,
        storey: signage.storey,
        context: 'bim',
        type: 'signage'
      };
      this.three.scene.scene.add(object);
      this.signagesObjects.push(object);
    }
  }

  private startListeningCursor(mode: 'create' | 'select' | 'move'): void {
    this.eventAggregator.publish('aurelia-three:select-tool:deactivate');
    this.listenToCursor = mode;
  }
  
  private stopListeningCursor(backTo: false | 'select'): void {
    this.listenToCursor = backTo;
  }

  private listenCursor(): void {
    this.three.cursorControls.addEventListener('objects-intersects', async (data: {type: 'objects-intersects', target: CursorControls, gestureType: 'down' | 'up' | 'move', objectsIntersects: Intersection[], scene: Scene, position: Vector2}) => {
      if (!this.listenToCursor) {
        return;
      }
      const firstIntersect = data.objectsIntersects.length > 0 ? data.objectsIntersects[0] : undefined;
      if (!firstIntersect) {
        return;
      }
      const isSignage = firstIntersect.object.userData.type === 'signage';
      if (data.gestureType === 'move') {
        this.highlightSignage(isSignage && this.listenToCursor === 'select' ? firstIntersect.object as Mesh : undefined);
        if (isSignage) {
          this.three.canvas.classList.add('signage-tool-hoverable');
        } else {
          this.three.canvas.classList.remove('signage-tool-hoverable');
        }
      } else if (data.gestureType === 'down' && this.listenToCursor === 'create') {
        if (firstIntersect.object.userData.storey && this.siteNavigator.selectedLevelName) {
          this.createNewSignage(firstIntersect.point);
          this.stopListeningCursor('select');
        }
      } else if (data.gestureType === 'down' && this.listenToCursor === 'select' && isSignage) {
        this.selectSignage(firstIntersect.object.userData.signageId);
      } else if (data.gestureType === 'down' && this.listenToCursor === 'move' && this.selectedSignage) {
        if (firstIntersect.object.userData.storey && this.siteNavigator.selectedLevelName) {
          this.selectedSignage.position = firstIntersect.point;
          this.movingSignage = false;
          this.updateSignagePositionFromSignageData();
          this.signageHasChanged = true;
          this.stopListeningCursor('select');
        }
      }
    });
  }

  private highlightedUuid: string | undefined = undefined;
  private highlightSignage(signageObject: Mesh | undefined) {
    if (signageObject?.uuid !== this.highlightedUuid) {
      this.highlightedUuid = signageObject?.uuid;
      if (!signageObject) {
        this.three.stylingManager.disposeStyle('highlight-signage-object');
        this.three.stylingManager.apply();
        return;
      }
      this.three.stylingManager.registerStyle('highlight-signage-object', [
        {
          conditions: [
            {
              key: 'uuid',
              operator: '=',
              value: signageObject.uuid
            }
          ],
          conditionOperator: 'and',
          applyToChildren: false,
          definitions: [
            {
              bbox: {
                color: 'white',
                opacity: 1,
                depthTest: false,
                clipLikeMaterial: true
              },
              highlight: {
                color: 'cyan',
                depthTest: false,
                opacity: 0.5,
                clipLikeMaterial: true
              }
            }
          ]
        }
      ], 100, true);
      this.three.stylingManager.apply()
    }
  }

  public async createNewSignage(position: Vector3): Promise<void> {
    if (!this.siteManager.siteId) {
      return;
    }
    if (!this.siteNavigator.selectedLevelName) {
      return;
    }
    if (this.siteNavigator.siteManager.siteId !== this.siteManager.siteId) {
      return;
    }
    const signage = new ThreeSignageModel();
    signage.position = new Vector3(
      Math.round(position.x * 1000) / 1000,
      Math.round(position.y * 1000) / 1000,
      Math.round(position.z * 1000) / 1000,
    );
    signage.siteId = this.siteManager.siteId;
    signage.building = this.siteNavigator.selectedBuildingName;
    signage.storey = this.siteNavigator.selectedLevelName;
    signage.selectionPoints = [];
    signage.items = [];
    const createdSignage = await signage.save();
    await this.fetchSignages();
    this.selectSignage(createdSignage.id);
  }
  
  public selectSignage(signageId: string): void {
    if (this.selectedSignage?.id === signageId) {
      return;
    }
    const signage = this.signages.find(s => s.id === signageId);
    this.signageHasChanged = false;
    this.selectedSignage = signage;
  }

  public unselectSignage(): void {
    if (this.selectedSignage) {
      this.selectedSignage = undefined;
      this.signageHasChanged = false;
    }
  }

  public async saveSignage(): Promise<void> {
    try {
      if (!this.selectedSignage.id) {
        await this.selectedSignage.save();
      } else {
        await this.selectedSignage.updateProperties('', Object.keys(this.selectedSignage));
      }
      this.signageHasChanged = false;
      await this.fetchSignages();
    } catch (error) {
      console.error(error);
    }
  }

  public async deleteSignage(): Promise<void> {
    const response = await ConfirmDialog.renderModal({title: 'Are you sure ?', text: `You are about to completely and permanentely remove the selected signage.`});
    if (response.wasDismissed) {
      return;
    }
    await this.selectedSignage.remove();
    await this.fetchSignages();
    this.unselectSignage();
  }

  public async editSignagePosition(): Promise<void> {
    const initialValue = {
      x: `${this.selectedSignage.position.x}`,
      y: `${this.selectedSignage.position.y}`,
      z: `${this.selectedSignage.position.z}`,
    };
    const response = await AdjustTranslationRotationDialog.renderModal({mode: 'translation', initialValue});
    if (!response.wasDismissed) {
      this.selectedSignage.position = new Vector3(
        parseFloat(response.value.x),
        parseFloat(response.value.y),
        parseFloat(response.value.z)
      );
      this.signageHasChanged = true;
      this.updateSignagePositionFromSignageData();
    }
  }

  public async editLayout(): Promise<void> {
    const options = SignageTool.LayoutsList.map(l => {
      return {value: l.value, label: l.label};
    });
    const response = await SelectDialog.renderModal({title: 'Select a Layout', options, initialValue: this.selectedSignage.layout});
    if (response.wasDismissed) {
      return;
    }
    const newLayout = response.value;
    if (newLayout === this.selectedSignage.layout) {
      return;
    }
    this.selectedSignage.layout = newLayout;
    this.signageHasChanged = true;
  }

  public layoutName(layoutValue: string): string {
    const layout = SignageTool.LayoutsList.find(l => l.value === layoutValue);
    return layout?.label;
  }

  private updateSignagePositionFromSignageData(): void {
    const object = this.signagesObjects.find(o => o.userData.signageId === this.selectedSignage.id);
    if (object) {
      object.position.set(
        this.selectedSignage.position.x,
        this.selectedSignage.position.y,
        this.selectedSignage.position.z,
      );
    }
  }

  public async addSignageItem(): Promise<void> {
    const response = await EditSignageItemDialog.renderModal({
      title: 'Edit signage', 
      iconsList: SignageTool.IconsList,
      deletable: false,
    });
    if (!response.wasDismissed) {
      this.selectedSignage.items = Array.isArray(this.selectedSignage.items) ? this.selectedSignage.items : [];
      this.selectedSignage.items.push(response.value);
      this.signageHasChanged = true;
    }
  }

  public async editSignageItem(item: SignageItem): Promise<void> {
    const response = await EditSignageItemDialog.renderModal({
      title: 'Edit signage',
      iconsList: SignageTool.IconsList,
      initialValue: {...item},
    });
    if (!response.wasDismissed) {
      this.selectedSignage.items = Array.isArray(this.selectedSignage.items) ? this.selectedSignage.items : [];
      const index = this.selectedSignage.items.indexOf(item);
      if (index !== -1) {
        if (response.value.deleted) {
          this.selectedSignage.items.splice(index, 1);
        } else {
          this.selectedSignage.items.splice(index, 1, response.value);
        }
        this.signageHasChanged = true;
      }
    }
  }

  public itemsOrderChanged(): void {
    this.signageHasChanged = true;
  }

  private movingSignage = false;
  public moveSignage(): void {
    this.movingSignage = true;
    this.startListeningCursor('move');
  }

  public cancelMovingSignage(): void {
    this.movingSignage = false;
    this.stopListeningCursor('select');
  }

  public objectsOnSameLevel(signage: ThreeSignageModel): string[] {
    return SignageTool.getObjectsOnSameLevel(signage, this.siteManager);
  }

  public addItem(label: string): void {
    this.selectedSignage.items.push({
      iconLeft: '',
      iconRight: '',
      label
    });
    this.signageHasChanged = true;
  }

  public getIconUrl(iconValue: string): string {
    return SignageTool.getIconUrl(iconValue);
  }

  public async downloadPDF(): Promise<void> {
    const pdfGenerator = new SignageToolDownloadPDF();
    try {
      await pdfGenerator.download(this.selectedSignage);
    } catch (error) {
      console.error(error);
    }
  }
  
}
