import { css } from '@microsoft/fast-element';
import { display } from "@microsoft/fast-foundation";

export const NextStyles = css`
  ${display("grid")}

  :host {
    display: grid;
    grid-template-columns: 1fr;
    overflow: hidden;
  }

  :host([fixed]) {
    position: relative;
    width: 100%;
    height: 100%;
    display: block
  }

  ::slotted(.next-item) {
    grid-row: 1;
    grid-column: 1;
    -webkit-transform: translate3d(0, 0, 0);
    transform: translate3d(0, 0, 0);
  }

  :host([fixed]) ::slotted(.next-item) {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    overflow-x: hidden;
    overflow-y: auto;
    z-index: 1;
  }

  ::slotted(.next-item.animate) {
    -webkit-transition: transform var(--next-animation-duration, 400ms) var(--next-animation-leave-function, ease-in);
    transition: transform var(--next-animation-duration, 400ms) var(--next-animation-leave-function, ease-in);
  }
  
  ::slotted(.next-item.prev) {
    -webkit-transform: translate3d(-100%, 0, 0);
    transform: translate3d(-100%, 0, 0);
  }
  
  ::slotted(.next-item.next) {
    -webkit-transform: translate3d(100%, 0, 0);
    transform: translate3d(100%, 0, 0);
  }
  
  ::slotted(.next-item.animate.current) {
    z-index: 2;
    transition-timing-function: var(---next-animation-enter-function, ease-in)
  }
`.withBehaviors(
  
);