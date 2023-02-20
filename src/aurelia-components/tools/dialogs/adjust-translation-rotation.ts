import { Dialog, Menu, MenuItem, ElementDefinitionContext, TextField } from "@microsoft/fast-foundation";
import { html, repeat, css  } from "@microsoft/fast-element";
import { ref, attr, when, observable } from "@microsoft/fast-element";
import { dialogStyles } from '../../../components/dialogs/dialog-styles';
import { dialogHeadTemplate, dialogFootTemplate, BaseDialog, BaseOptions, BaseDialogDefinition, BaseDialogResponse } from '../../../components/dialogs/base'; 

// Extend the configuration with custom properties
interface AdjustTranslationRotationDialogDefinition extends BaseDialogDefinition {

}

const adjustTranslationRotationDialogStyles = (ctx: ElementDefinitionContext) => css`
  ${dialogStyles(ctx)}
  :host .form-row > *{
    display: block;
    width: 100%;
  }
  :host .form-row + .form-row {
    margin-top: 16px;
  }
`;

const adjustTranslationRotationDialogTemplate = (context: ElementDefinitionContext, definition: AdjustTranslationRotationDialogDefinition) => {
  const dialogTag = context.tagFor(Dialog);
  const textFieldTag = context.tagFor(TextField);

  return html<AdjustTranslationRotationDialog>`
    <${dialogTag} prompt>
      ${dialogHeadTemplate(context, definition)}
      <div class="dialog-content" part="dialog-content">

        <form>
          <div class="form-row">
            <label>X</label>
            <${textFieldTag} :value="${x => x.currentValue.x}" type="number" ${ref('xInput' as any)}>
              ${when(x => x.mode === 'translation', html`<span slot="end">m</span>`)}
              ${when(x => x.mode === 'rotation', html`<span slot="end">°</span>`)}
            </${textFieldTag}>
          </div>
          <div class="form-row">
            <label>Y</label>
            <${textFieldTag} :value="${x => x.currentValue.y}" type="number" ${ref('yInput' as any)}>
              ${when(x => x.mode === 'translation', html`<span slot="end">m</span>`)}
              ${when(x => x.mode === 'rotation', html`<span slot="end">°</span>`)}
            </${textFieldTag}>
          </div>
          <div class="form-row">
            <label>Z</label>
            <${textFieldTag} :value="${x => x.currentValue.z}" type="number" ${ref('zInput' as any)}>
              ${when(x => x.mode === 'translation', html`<span slot="end">m</span>`)}
              ${when(x => x.mode === 'rotation', html`<span slot="end">°</span>`)}
            </${textFieldTag}>
          </div>
        </form>
      </div>

      ${dialogFootTemplate(context, definition)}
    </${dialogTag} prompt>
  `;
}

interface ResponseValue {x: string, y: string, z: string};

interface AdjustTranslationRotationOptions extends BaseOptions<ResponseValue> {
  mode: 'translation' | 'rotation';
}

export class AdjustTranslationRotationDialog extends BaseDialog {

  public static async renderModal(options: AdjustTranslationRotationOptions): Promise<BaseDialogResponse<ResponseValue>> {
    const {dialogElement, promise} = this.renderBaseModal<AdjustTranslationRotationDialog, ResponseValue>(options);
    if (options?.mode) {
      dialogElement.mode = options.mode;
    }
    dialogElement.initialValueInDeg();
    return promise;
  }

  @observable
  public mode: 'translation' | 'rotation' = 'translation';
  public currentValue: ResponseValue = {x: '0', 'y': '0', z: '0'};
  private xInput: HTMLInputElement;
  private yInput: HTMLInputElement;
  private zInput: HTMLInputElement;

  public initialValueInDeg(): void {
    if (this.mode === 'rotation') {
      this.currentValue.x = this.radToDeg(this.currentValue.x);
    }
    if (this.mode === 'rotation') {
      this.currentValue.y = this.radToDeg(this.currentValue.y);
    }
    if (this.mode === 'rotation') {
      this.currentValue.z = this.radToDeg(this.currentValue.z);
    }
  }

  public ok(): void {
    this.currentValue.x = this.xInput.value || '0';
    this.currentValue.y = this.yInput.value || '0';
    this.currentValue.z = this.zInput.value || '0';
    if (this.mode === 'rotation') {
      this.currentValue.x = this.degToRad(this.currentValue.x);
    }
    if (this.mode === 'rotation') {
      this.currentValue.y = this.degToRad(this.currentValue.y);
    }
    if (this.mode === 'rotation') {
      this.currentValue.z = this.degToRad(this.currentValue.z);
    }
    super.ok();
  }

  private radToDeg(value: string): string {
    const rad = parseFloat(value);
    const deg = Math.round(rad * 180 / Math.PI * 100) / 100;
    return `${deg}`;
  }

  private degToRad(value: string): string {
    const deg = parseFloat(value);
    const rad = Math.round(deg / 180 * Math.PI * 100) / 100;
    return `${rad}`;
  }
}

export const adjustTranslationRotationDialog = AdjustTranslationRotationDialog.compose<AdjustTranslationRotationDialogDefinition>({
  baseName: 'adjust-translation-rotation-dialog',
  template: adjustTranslationRotationDialogTemplate,
  styles: adjustTranslationRotationDialogStyles,
  defaultTitleContent: "Adjust values",
  defaultOKButtonText: "OK",
  defaultCancelButtonText: "Cancel"
});
