import { css } from '@microsoft/fast-element';
import { display } from "@microsoft/fast-foundation";

export const FormStyles = css`
  ${display("flex")}

  :host {
    contain: style;
    flex-direction: column;
  }
  ::slotted(label) {
    margin-bottom: 4px;
  }
`;