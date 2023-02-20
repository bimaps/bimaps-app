import { accentForegroundRest, accentForegroundHover, strokeWidth, neutralStrokeRest, neutralLayerFloating } from '@microsoft/fast-components';
import { css } from '@microsoft/fast-element';
import { display, focusVisible } from "@microsoft/fast-foundation";
import { elevation } from '../elevation';

export const DateFieldStyles = css`
  ${display("grid")}

  :host {
    --elevation: 14;
    contain: style;
    grid-gap: var(--spacing-unit-sm);
  }
  :host(:${focusVisible}) {
    outline: none;
  }

  :host([disabled]) .calendar-icon {
    display: none;
  }
  .calendar-icon {
    cursor: pointer;
    color: ${accentForegroundRest};
  }
  .calendar-icon: hover {
    color: ${accentForegroundHover};
  }

  .picker[hidden] {
    display: none;
  }
  .picker {
    ${elevation}
    border: calc(${strokeWidth} * 1px) solid ${neutralStrokeRest};
    padding: var(--spacing-unit-sm);
    background: ${neutralLayerFloating};
    border-radius: calc(var(--control-corner-radius) * 1px);
    z-index: 1;
  }

  .calendar {
  }
`;