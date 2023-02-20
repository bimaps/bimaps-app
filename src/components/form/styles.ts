import { css } from '@microsoft/fast-element';
import { display } from "@microsoft/fast-foundation";

export const FormStyles = css`
  ${display("grid")}

  :host {
    contain: style;
    grid-gap: var(--spacing-unit);
  }
`;