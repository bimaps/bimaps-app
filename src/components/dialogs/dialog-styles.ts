import { Dialog, Button, ElementDefinitionContext } from "@microsoft/fast-foundation";
import { css  } from "@microsoft/fast-element";
import { designUnit, accentFillFocus, accentFillHover, foregroundOnAccentFocus, foregroundOnAccentHover, neutralForegroundRest, neutralLayerFloating, neutralStrokeRest, strokeWidth, typeRampBaseFontSize, typeRampPlus2FontSize } from "@microsoft/fast-components";

export const dialogStyles = (context: ElementDefinitionContext) => {
  const dialogTag = context.tagFor(Dialog);
  const buttonTag = context.tagFor(Button);

  return css`

      :host {
        --spacing-unit: calc(${designUnit} * 2);
        --spacing-unit-lg: calc(var(--spacing-unit) * 2);
      }

      ${dialogTag} {
        --dialog-width: auto;
        --dialog-height: auto;
      }

      ${dialogTag}[prompt]::part(control) {
        max-width: 500px;
      }

      ${dialogTag}::part(control) {
        min-width: 300px;
        background: ${neutralLayerFloating};
        color: ${neutralForegroundRest};
        font-size: ${typeRampBaseFontSize};
      }
      
      ${dialogTag} .dialog-head {
        display: grid;
        grid-gap: calc(var(--spacing-unit-lg) * 1px);
        grid-template-columns: 1fr min-content;
        align-items: center;
        padding: 0 calc(var(--spacing-unit) * 1px);
        font-size: ${typeRampPlus2FontSize};
        border-bottom: calc(${strokeWidth} * 1px) ${neutralStrokeRest} solid;
        padding: calc(var(--spacing-unit) * 1px) calc(var(--spacing-unit) * 2px);
      }

      ${dialogTag} .dialog-head ${buttonTag} {
        width: 40px;
        height: 40px;
      }
      /*
      */
      ${dialogTag} .dialog-head ${buttonTag}::part(control) {
        padding: 0;
      }
      ${dialogTag} .dialog-head ${buttonTag}::part(content) {
        display: flex;
      }
      ${dialogTag} .dialog-head ${buttonTag}::part(content)::before {
        background: transparent;
      }
      ${dialogTag} .dialog-head ${buttonTag}:hover {
        background: ${accentFillHover};
        color: ${foregroundOnAccentHover};
      }
      ${dialogTag} .dialog-head ${buttonTag}:focus {
        background: ${accentFillFocus};
        color: ${foregroundOnAccentFocus};
      }
      
      ${dialogTag} .dialog-foot {
        display: grid;
        grid-gap: calc(var(--spacing-unit-lg) * 1px);
        grid-template-columns: 1fr min-content;
        align-items: center;
        padding: calc(var(--spacing-unit) * 1px) calc(var(--spacing-unit) * 2px);
        border-top: calc(${strokeWidth} * 1px) ${neutralStrokeRest} solid;
      }
      
      ${dialogTag} .dialog-foot > * {
        gap: calc(var(--spacing-unit) * 1px);
      }
      
      ${dialogTag} .dialog-content {
        padding: calc(var(--spacing-unit) * 3px) calc(var(--spacing-unit) * 2px);
        max-height: calc(100vh - 200px);
        overflow-y: auto;
      }

  `;
}
