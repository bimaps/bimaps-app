import { Dialog, ElementDefinitionContext } from "@microsoft/fast-foundation";
import { html, when, repeat } from "@microsoft/fast-element";
import { attr } from "@microsoft/fast-element";
import { dialogStyles } from './dialog-styles';
import { dialogHeadTemplate, dialogFootTemplate, BaseDialog, BaseOptions, BaseDialogDefinition, BaseDialogResponse } from './base'; 

// Extend the configuration with custom properties
interface ConfirmDialogDefinition extends BaseDialogDefinition {
  defaultTextContent?: string;
}

const confirmDialogTemplate = (context: ElementDefinitionContext, definition: ConfirmDialogDefinition) => {
  const dialogTag = context.tagFor(Dialog);

  return html<ConfirmDialog>`
    <${dialogTag} prompt>
      ${dialogHeadTemplate(context, definition)}
      ${when(x => x.text?.length > 0 || definition.defaultTextContent?.length > 0, html<ConfirmDialog>`
        <div class="dialog-content" part="dialog-content">
          <slot name="text">
          ${repeat(x => x.text.split('\n'), html<string>`
          ${x => x}<br>
          `) || definition.defaultTextContent}
          </slot>
        </div>
      `)}
      ${dialogFootTemplate(context, definition)}
    </${dialogTag}>
  `;
}

interface ConfirmOptions extends BaseOptions<boolean> {
  text?: string;
}

export class ConfirmDialog extends BaseDialog {

  public static async renderModal(options: ConfirmOptions): Promise<BaseDialogResponse<boolean>> {
    options.initialValue = true;
    const { dialogElement, promise } = this.renderBaseModal<ConfirmDialog, boolean>(options);
    if (options.text) {
      dialogElement.text = options.text;
    }
    return promise;
  }

  @attr
  public text = '';
  
}

export const confirmDialog = ConfirmDialog.compose<ConfirmDialogDefinition>({
  baseName: 'confirm-dialog',
  template: confirmDialogTemplate,
  styles: dialogStyles,
  defaultTitleContent: "Confirm",
  defaultTextContent: "",
  defaultOKButtonText: "OK",
  defaultCancelButtonText: "Cancel"
});
