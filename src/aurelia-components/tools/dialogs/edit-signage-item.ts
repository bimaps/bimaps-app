import { SignageTool } from './../signage-tool';
import { SignageItem } from './../../../models/signage.model';
import { Dialog, ElementDefinitionContext, TextField, Button } from "@microsoft/fast-foundation";
import { html, repeat, css  } from "@microsoft/fast-element";
import { ref, attr, when, observable } from "@microsoft/fast-element";
import { dialogStyles } from '../../../components/dialogs/dialog-styles';
import { dialogHeadTemplate, BaseDialog, BaseOptions, BaseDialogDefinition, BaseDialogResponse } from '../../../components/dialogs/base'; 
import { accentFillFocus } from '@microsoft/fast-components';

// Extend the configuration with custom properties
interface EditSignageItemDialogDefinition extends BaseDialogDefinition {
  defaultDeleteButtonText: string;
}

const editSignageItemDialogStyles = (ctx: ElementDefinitionContext) => css`
  ${dialogStyles(ctx)}
  .form-row > *{
    display: block;
    width: 100%;
  }
  .form-row + .form-row {
    margin-top: 16px;
  }

  .icons-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 8px 0;
  }
  .icons-list img {
    width: 25px;
    height: 25px;
    border-radius: 4px;
    cursor: pointer;
  }
  .icons-list img.selected {
    outline: 2px solid ${accentFillFocus};
    outline-offset: 2px;
  }
`;

const editSignageItemDialogTemplate = (context: ElementDefinitionContext, definition: EditSignageItemDialogDefinition) => {
  const dialogTag = context.tagFor(Dialog);
  const textFieldTag = context.tagFor(TextField);
  const buttonTag = context.tagFor(Button);

  return html<EditSignageItemDialog>`
    <${dialogTag} prompt>
      ${dialogHeadTemplate(context, definition)}
      <div class="dialog-content" part="dialog-content">

        <form>
          <div class="form-row">
            <label>Left icon</label>
            <div class="icons-list">
              ${repeat(x => x.iconsList, html<{label: string, value: string}, EditSignageItemDialog>`
                <img
                  class="${(x, c) => x.value === c.parent.currentlySelectedIcon ? 'selected' : ''}"
                  src="${(x, c) => c.parent.getIconUrl(x.value)}"
                  @click="${(x, c) => c.parent.selectIcon(x.value)}"
                   />
              `)}
            </div>
          </div>
          <div class="form-row">
            <label>Label</label>
            <${textFieldTag} :value="${x => x.currentValue.label}" type="text" ${ref('labelInput' as any)}></${textFieldTag}>
          </div>
        </form>
      </div>

      <div class="dialog-foot" part="dialog-foot">
        <span>
          ${when(x => x.deletable, html`
            <${buttonTag} tabindex="2" appearance="lightweight" @click="${x => x.delete()}">${x => x.deleteButtonText || definition.defaultDeleteButtonText}</${buttonTag}>
          `)}
        </span>
        <span>
          <${buttonTag} tabindex="1" appearance="accent" @click="${x => x.ok()}">${x => x.okButtonText || definition.defaultOKButtonText}</${buttonTag}>
        </span>
      </div>

    </${dialogTag} prompt>
  `;
}

type ResponseValue = SignageItem & {deleted?: true};

interface EditSignageItemOptions extends BaseOptions<ResponseValue> {
  iconsList: {value: string, label: string}[];
  deleteButtonText?: string;
  deletable?: boolean;
}

export class EditSignageItemDialog extends BaseDialog {

  public static async renderModal(options: EditSignageItemOptions): Promise<BaseDialogResponse<ResponseValue>> {
    const {dialogElement, promise} = this.renderBaseModal<EditSignageItemDialog, ResponseValue>(options);
    if (options?.iconsList) {
      dialogElement.iconsList = options.iconsList;
    }
    if (options?.deleteButtonText) {
      dialogElement.deleteButtonText = options.deleteButtonText;
    }
    if (typeof options?.deletable === 'boolean') {
      dialogElement.deletable = options.deletable;
    }
    if (options.initialValue?.iconLeft) {
      dialogElement.currentlySelectedIcon = options.initialValue.iconLeft;
      options.initialValue.iconRight = '';
    } else if (options.initialValue?.iconRight) {
      dialogElement.currentlySelectedIcon = options.initialValue.iconRight;
    }
    return promise;
  }

  @observable
  public iconsList: {value: string, label: string}[];
  public currentValue: ResponseValue = {iconLeft: '', label: '', iconRight: ''};
  private labelInput: TextField;

  @attr({mode: 'boolean'})
  public deletable = true;

  @attr
  public deleteButtonText = '';

  public ok(): void {
    this.currentValue.label = this.labelInput.value || '';
    super.ok();
  }

  public delete(): void {
    this.currentValue.deleted = true;
    super.ok();
  }

  public getIconUrl(iconValue: string): string {
    return SignageTool.getIconUrl(iconValue);
  }

  @observable
  public currentlySelectedIcon: string = '';
  public selectIcon(iconValue: string): void {
    if (iconValue.toLowerCase().includes('right')) {
      this.currentValue.iconLeft = '';
      this.currentValue.iconRight = iconValue;
    } else {
      this.currentValue.iconLeft = iconValue;
      this.currentValue.iconRight = '';
    }
    this.currentlySelectedIcon = iconValue;
  }
}

export const editSignageItemDialog = EditSignageItemDialog.compose<EditSignageItemDialogDefinition>({
  baseName: 'edit-signage-item-dialog',
  template: editSignageItemDialogTemplate,
  styles: editSignageItemDialogStyles,
  defaultTitleContent: "Edit item",
  defaultOKButtonText: "OK",
  defaultCancelButtonText: "Cancel",
  defaultDeleteButtonText: "Delete"
});
