import { FoundationElement, Dialog, Button, ElementDefinitionContext, FoundationElementDefinition, DesignSystem } from "@microsoft/fast-foundation";
import { html, when  } from "@microsoft/fast-element";
import { attr } from "@microsoft/fast-element";

// Extend the configuration with custom properties
export interface BaseDialogDefinition extends FoundationElementDefinition {
  defaultTitleContent?: string;
  defaultOKButtonText?: string;
  defaultCancelButtonText?: string;
}

export const dialogHeadTemplate = (context: ElementDefinitionContext, definition: BaseDialogDefinition) => {
  // const dialogTag = context.tagFor(Dialog);
  const buttonTag = context.tagFor(Button);

  return html<BaseDialog>`
    ${when(x => x.title?.length > 0, html<BaseDialog>`
      <div class="dialog-head" part="dialog-head">
        <slot name="title">${x => x.title || definition.defaultTitleContent}</slot>
        <${buttonTag} appearance="lightweight" @click="${x => x.cancel()}" tabindex="3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </${buttonTag}>
      </div>
    `)}
  `;
};

export const dialogFootTemplate = (context: ElementDefinitionContext, definition: BaseDialogDefinition) => {
  const dialogTag = context.tagFor(Dialog);
  const buttonTag = context.tagFor(Button);

  return html<BaseDialog>`
    <div class="dialog-foot" part="dialog-foot">
      <span>
      ${when(x => x.okOnly == false, html`
        <${buttonTag} tabindex="2" appearance="lightweight" @click="${x => x.cancel()}">${x => x.cancelButtonText || definition.defaultCancelButtonText}</${buttonTag}>
      `)}
      </span>
      <span>
        <${buttonTag} tabindex="1" appearance="accent" @click="${x => x.ok()}">${x => x.okButtonText || definition.defaultOKButtonText}</${buttonTag}>
      </span>
    </div>
  `;
}

export interface BaseOptions<T = any> {
  title?: string;
  okButtonText?: string;
  cancelButtonText?: string;
  dismissable?: boolean;
  okOnly?: boolean;
  initialValue?: T;
}

export interface BaseDialogResponse<T = any> {
  wasDismissed: boolean;
  value?: T;
}

export class BaseDialog extends FoundationElement {

  public currentValue: any;

  protected static renderBaseModal<T extends BaseDialog = BaseDialog, R = any>(options?: BaseOptions<R>): {dialogElement: T, promise: Promise<BaseDialogResponse<R>>} {
    const dialogTag = DesignSystem.tagFor(this);
    const dialogElement = document.createElement(dialogTag) as T;
    const promise = new Promise<BaseDialogResponse<R>>((resolve) => {

      if (options.initialValue) {
        dialogElement.currentValue = options.initialValue;
      }

      if (options?.title) {
        dialogElement.title = options.title;
      }

      if (options?.okButtonText) {
        dialogElement.okButtonText = options.okButtonText;
      }

      if (options?.cancelButtonText) {
        dialogElement.cancelButtonText = options.cancelButtonText;
      }

      if (typeof options?.dismissable === 'boolean') {
        dialogElement.dismissable = options.dismissable;
      }

      if (typeof options?.okOnly === 'boolean') {
        dialogElement.okOnly = options.okOnly;
      }

      dialogElement.addEventListener('ok', (event: CustomEvent) => {
        dialogElement.remove();
        resolve({
          wasDismissed: false,
          value: dialogElement.currentValue
        });
      }, {once: true});

      dialogElement.addEventListener('cancel', () => {
        dialogElement.remove();
        resolve({
          wasDismissed: true,
          value: undefined
        });
      }, {once: true});

      if (options.dismissable) {
        dialogElement.addEventListener('dismiss', () => {
          dialogElement.remove();
          resolve({
            wasDismissed: true,
            value: undefined
          });
        }, {once: true});
      }
      document.body.appendChild(dialogElement);
    });
    return {
      dialogElement,
      promise
    };
  }

  @attr({ mode: "boolean" })
  public dismissable = false;

  @attr({ mode: "boolean" })
  public okOnly = false;

  @attr
  public title = '';

  @attr
  public okButtonText = '';

  @attr
  public cancelButtonText = '';

  public cancel(): void {
    this.$emit('cancel', undefined, {bubbles: false});
  }

  public ok(): void {
    this.$emit('ok', true, {bubbles: false});
  }
  
}
