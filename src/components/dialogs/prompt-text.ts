import { Dialog, Menu, MenuItem, ElementDefinitionContext, TextField } from "@microsoft/fast-foundation";
import { html, repeat, css  } from "@microsoft/fast-element";
import { attr, ref } from "@microsoft/fast-element";
import { dialogStyles } from './dialog-styles';
import { dialogHeadTemplate, dialogFootTemplate, BaseDialog, BaseOptions, BaseDialogDefinition, BaseDialogResponse } from './base'; 

// Extend the configuration with custom properties
interface PromptTextDialogDefinition extends BaseDialogDefinition {

}

const promptTextDialogStyles = (ctx: ElementDefinitionContext) => {
  const textFieldTag = ctx.tagFor(TextField);

  return css`
    ${dialogStyles(ctx)}
    :host .dialog-content {
      padding: 8px;
    }

    ${textFieldTag} {
      width: 100%;
    }
  }`
};

const promptTextDialogTemplate = (context: ElementDefinitionContext, definition: PromptTextDialogDefinition) => {
  const dialogTag = context.tagFor(Dialog);
  const textFieldTag = context.tagFor(TextField);

  return html<PromptTextDialog>`
    <${dialogTag} prompt>
      ${dialogHeadTemplate(context, definition)}
      <div class="dialog-content" part="dialog-content">
        <${textFieldTag} :value="${x => x.currentValue}" ${ref('textFieldInput')}></${textFieldTag}>
      </div>

      ${dialogFootTemplate(context, definition)}
    </${dialogTag} prompt>
  `;
}

interface PromptTextOptions extends BaseOptions<string> {
}

export class PromptTextDialog extends BaseDialog {

  public static async renderModal(options: PromptTextOptions): Promise<BaseDialogResponse<string>> {
    const {dialogElement, promise} = this.renderBaseModal<PromptTextDialog, string>(options);
    return promise;
  }

  @attr({ mode: "boolean" })
  public autoclose = true;

  public currentValue: string = '';

  public textFieldInput: TextField;

  public ok(): void {
    this.currentValue = this.textFieldInput.value;
    this.$emit('ok', true, {bubbles: false});
  }
}

export const promptTextDialog = PromptTextDialog.compose<PromptTextDialogDefinition>({
  baseName: 'prompt-text-dialog',
  template: promptTextDialogTemplate,
  styles: promptTextDialogStyles,
  defaultTitleContent: "",
  defaultOKButtonText: "OK",
  defaultCancelButtonText: "Cancel"
});
