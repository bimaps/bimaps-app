import { customElement, FASTElement, attr, DOM, observable } from '@microsoft/fast-element';
import { NextStyles as styles } from './styles';
import { NextTemplate as template } from './template';

/**
 * @internal
 * 
 * All slotted items receive either the 'prev' or 'next' class
 * according to their position compared to the activeid
 * 
 * The activeid has no class
 * 
 * When an animation start, the next/prev/current are set
 * before to start animation by setting the animate class
 * 
 * Once the animation is finished, the current class is removed
 * as the current item is now in position
*/

@customElement({
  name: 'fast-next',
  template,
  styles
})
export class FastNext extends FASTElement {

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('popstate', this);
    this.pushStateIdChanged();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this);
  }

  public handleEvent(event: PopStateEvent): void {
    if (this.pushStateId && event.state?.fastNextId === this.pushStateId && event.state?.fastNextElementId) {
      const lastOperation = this.previousOperations[this.previousOperations.length - 1];
      if (lastOperation && event.state?.fastNextElementId === lastOperation?.id && event.state?.fastNextDirection === lastOperation?.direction) {
        this.back(true);
        return;
      }
      this.goToId(event.state?.fastNextElementId, event.state?.fastNextDirection === 'next' ? 'next' : 'prev', true);
    }
  }

  @attr({attribute: 'push-state-id'})
  public pushStateId = '';
  public pushStateIdChanged(): void {
    if (this.pushStateId) {
      const url = new URL(location.href);
      if (url.searchParams.get(this.pushStateId)) {
        this.activeid = url.searchParams.get(this.pushStateId);
        DOM.queueUpdate(() => {
          this.ensureIdInUrl();
        });
      }
    }
  }

  public hasHistory = false;

  @attr
  public autodetectback = true;

  /**
   * The id of the active item
   *
   * @public
   * @remarks
   * HTML Attribute: activeid
   */
  @attr
  public activeid: string;

  /**
   * @internal
   */
  public activeidChanged(): void {
    if (
      this.$fastController.isConnected
    ) {
      if (this.activeitem) {
        this.goToId(this.activeid);
      }
    }
  }

  /**
   * @internal
   */
  @observable
  public items: (HTMLElement | Node)[] = [];
  /**
   * @internal
   */
  public itemsChanged(): void {
    if (this.$fastController.isConnected) {
      this.setItems();
    }
  }
  public nextItems: HTMLElement[] = [];

  /**
   * A reference to the active item
   * @public
   */
  public activeitem: HTMLElement;

  private activeIndex: number;
  private itemIds: Array<string | null>;
  private previousOperations: Array<{id: string, direction: 'prev' | 'next'}> = [];

  private changing = (): void => {
    this.$emit("changing", this.activeitem);
  };

  private changed = (): void => {
    this.$emit("changed", this.activeitem);
  };

  private setItems(): void {
    this.itemIds = [];
    this.nextItems = [];
    this.activeIndex = -1;
    let nextIndex = 0;
    this.items.forEach((item) => {
      if (item instanceof HTMLElement) {
        item.classList.add('next-item');
        this.nextItems.push(item);
        const itemId = item.getAttribute('id') || `next-item-${nextIndex + 1}`;
        item.setAttribute('id', itemId);
        this.itemIds.push(itemId);
        if (itemId === this.activeid) {
          this.activeIndex = nextIndex;
          this.activeitem = item;
        }
        nextIndex++;
      }
    });

    if (this.activeIndex === -1) {
      this.activeIndex = 0;
      this.activeid = this.itemIds[0];
      this.activeitem = this.nextItems[0];
    }

    this.setPositions();
  }

  private setPositions(): void {
    this.nextItems.forEach((item, index) => {
      if (index < this.activeIndex) {
        item.classList.remove('next');
        item.classList.remove('current');
        item.classList.add('prev');
      } else if (index > this.activeIndex) {
        item.classList.remove('prev');
        item.classList.remove('current');
        item.classList.add('next');
      } else {
        item.classList.remove('prev');
        item.classList.remove('next');
      }
    });
  }

  public next(): void {
    if (this.activeIndex < this.nextItems.length - 1) {
      const nextid = this.itemIds[this.activeIndex + 1];
      this.goToId(nextid);
    }
  }

  public prev(): void {
    if (this.activeIndex > 0) {
      const previd = this.itemIds[this.activeIndex - 1];
      this.goToId(previd);
    }
  }

  public back(fromPushState = false): void {
    if (this.previousOperations.length > 0) {
      const previousOperation = this.previousOperations.pop();
      this.goToId(previousOperation.id, previousOperation.direction === 'prev' ? 'next' : 'prev', false, fromPushState);
    }
  }

  private moving = false;
  private queuedOperations: {id: string, direction: 'prev' | 'next' | 'auto', trackOperation: boolean, fromPushState: boolean}[] = [];
  public goToId(id: string, direction: 'prev' | 'next' | 'auto' = 'auto', trackOperation = true, fromPushState = false): void {
    // Validate the move
    const goToIndex = this.itemIds.indexOf(id);
    if (goToIndex === -1) {
      return;
    }
    const goToElement = this.nextItems[goToIndex];
    if (goToElement.classList.contains('current')) {
      return;
    }

    // Once the move is validated, queue the move if one is already being processed
    if (this.moving) {
      this.queuedOperations.push({id, direction, trackOperation, fromPushState});
      return;
    }
    this.moving = true;

    if (!fromPushState) {
      this.ensureCurrentState();
    }
    if (direction === 'auto') {
      direction = goToIndex > this.activeIndex ? 'next' : 'prev';
    }

    const isPreviousId = this.previousOperations.length > 0 && id === this.previousOperations[this.previousOperations.length - 1].id;

    if (direction === 'next' || !isPreviousId) {
      // if the direction is "next" => we consider that it's not a "back" operation that should
      // be auto detected
      if (trackOperation && this.activeid) {
        this.previousOperations.push({id: this.activeid, direction});
      }
    } else if (this.autodetectback) {
      // here we know that we are calling gotoid with the id of the previously 
      // displayed element. Then, we can autodetect a back operation
      this.previousOperations.pop();
    }

    this.hasHistory = this.previousOperations.length > 0;

    const oppositeDirection = direction === 'next' ? 'prev' : 'next';

    goToElement.classList.add(direction);
    goToElement.classList.remove(oppositeDirection);

    this.changing();

    DOM.queueUpdate(() => {
      // start animating
      this.activeitem.classList.add('animate');
      goToElement.classList.add('animate');
      // start animation
      this.activeitem.classList.add(oppositeDirection);
      this.activeitem.classList.remove('current');
      goToElement.classList.remove(direction);
      goToElement.classList.add('current');

      goToElement.addEventListener("transitionend", () => {
        if (this.activeitem) {
          this.activeitem.classList.remove('animate');
        }
        if (goToElement) {
          goToElement.classList.remove('animate');
        }
        this.activeid = id;
        this.activeIndex = this.itemIds.indexOf(id);
        this.activeitem = goToElement;
        this.changed();
        if (!fromPushState) {
          this.setState(direction);
        }
        this.ensureIdInUrl();

        this.moving = false;
        if (this.queuedOperations.length > 0) {
          const nextOperation = this.queuedOperations.shift();
          this.goToId(nextOperation.id, nextOperation.direction, nextOperation.trackOperation, nextOperation.fromPushState);
        }
      }, {once: true});
    });
  }

  private ensureCurrentState(): void {
    if (!this.pushStateId) {
      return;
    }
    if (!history.state.fastNextId || !history.state.fastNextElementId) {
      history.replaceState(Object.assign({}, history.state, {fastNextId: this.pushStateId, fastNextElementId: this.activeid, fastNextDirection: 'auto'}), document.title);
    } 
  }

  private setState(direction: string): void {
    if (!this.pushStateId) {
      return;
    }
    history.pushState(Object.assign({}, history.state, {fastNextId: this.pushStateId, fastNextElementId: this.activeid, fastNextDirection: direction}), document.title);
  }

  private ensureIdInUrl() {
    if (!this.pushStateId) {
      return;
    }
    const url = new URL('', location.href);
    url.hash = location.hash;
    url.searchParams.set(this.pushStateId, this.activeid);
    history.replaceState(history.state, document.title, url.toString());  
  }
}
