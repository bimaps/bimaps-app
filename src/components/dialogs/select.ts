import { Dialog, Menu, MenuItem, ElementDefinitionContext } from "@microsoft/fast-foundation";
import { html, repeat, css  } from "@microsoft/fast-element";
import { attr, when } from "@microsoft/fast-element";
import { dialogStyles } from './dialog-styles';
import { dialogHeadTemplate, dialogFootTemplate, BaseDialog, BaseOptions, BaseDialogDefinition, BaseDialogResponse } from './base'; 

// Extend the configuration with custom properties
interface SelectDialogDefinition extends BaseDialogDefinition {

}

const selectDialogStyles = (ctx: ElementDefinitionContext) => css`
  ${dialogStyles(ctx)}
  :host .dialog-content {
    padding: 0;
  }
`;

const selectDialogTemplate = (context: ElementDefinitionContext, definition: SelectDialogDefinition) => {
  const dialogTag = context.tagFor(Dialog);
  const menuTag = context.tagFor(Menu);
  const menuItemTag = context.tagFor(MenuItem);

  return html<SelectDialog>`
    <${dialogTag} prompt>
      ${dialogHeadTemplate(context, definition)}
      <div class="dialog-content" part="dialog-content">
        <${menuTag}>
          ${repeat((x) => x.options, html<SelectOption, SelectDialog>`
            <${menuItemTag} @click="${(x, c) => c.parent.toggleOption(x)}" class="${(x, c) => x.value === c.parent.currentValue ? 'expanded' : ''}">
              ${x => x.label}
            </${menuItemTag}>
          `)}
        </${menuTag}>
      </div>

      ${dialogFootTemplate(context, definition)}
    </${dialogTag} prompt>
  `;
}

interface SelectOptions extends BaseOptions<string> {
  options: SelectOption[];
  autoclose?: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
}

export class SelectDialog extends BaseDialog {

  public static async renderModal(options: SelectOptions): Promise<BaseDialogResponse<string>> {
    const {dialogElement, promise} = this.renderBaseModal<SelectDialog, string>(options);
    dialogElement.options.splice(0, dialogElement.options.length);
    dialogElement.options.push(...options.options);
    
    if (typeof options?.autoclose === 'boolean') {
      dialogElement.autoclose = options.autoclose;
    }
    return promise;
  }

  @attr({ mode: "boolean" })
  public autoclose = true;

  public currentValue: string = '';
  public options: SelectOption[] = [];

  public toggleOption(option: SelectOption): void {
    if (option.value === this.currentValue) {
      // the lines below are a way to update the item in the options list
      // and letting fast template know that the item has changed
      const index = this.options.findIndex(o => o.value === option.value);
      if (index !== -1) {
        this.options.splice(index, 1, {value: option.value, label: option.label});
      }
      
      this.currentValue = '';
    } else {
      this.currentValue = option.value;
    }
    if (this.currentValue && this.autoclose) {
      this.ok();
    }
  }

}

export const selectDialog = SelectDialog.compose<SelectDialogDefinition>({
  baseName: 'select-dialog',
  template: selectDialogTemplate,
  styles: selectDialogStyles,
  defaultTitleContent: "Select",
  defaultOKButtonText: "OK",
  defaultCancelButtonText: "Cancel"
});
