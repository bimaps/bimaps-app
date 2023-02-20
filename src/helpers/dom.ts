export class DomHelpers {

  public static moveToBody(element: HTMLElement & {originalParent?: HTMLElement}): void {
    if (element.parentElement !== document.body) {
      element.originalParent = element.parentElement;
      document.body.appendChild(element);
    }
  }

  public static restoreFromBody(element: HTMLElement & {originalParent?: HTMLElement}): void {
    if (element.originalParent) {
      element.originalParent.appendChild(element);
      delete element.originalParent;
    }
  }

}
