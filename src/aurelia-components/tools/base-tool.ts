import { EventAggregator, Subscription } from 'aurelia-event-aggregator';

export class BaseTool {

  protected button: HTMLElement;
  protected panel: HTMLElement;
  protected hoverBoxPosition: 'next-tool-icon' | 'next-toolbar' = 'next-tool-icon';
  protected movePanelToBody = false;

  protected buttonId: string = `three-tool-btn-${Math.round(Math.random() * 1000)}`;

  public active = false;
  public opened = false;
  protected subs: Subscription[] = [];

  constructor(protected eventAggregator: EventAggregator) {}

  public attached() {
    if (this.button && this.panel) {
      this.button.addEventListener('click', this);
    }
    if (this.panel) {
      this.panel.classList.add(this.hoverBoxPosition);
    }
    this.listenForClose();
    if (this.movePanelToBody) {
      document.body.appendChild(this.panel);
    }
  }
  
  public detached() {
    this.button.removeEventListener('click', this);
    for (const sub of this.subs) {
      sub.dispose();
    }
    this.subs = [];
  }

  public handleEvent(event: MouseEvent): void {
    if (event instanceof MouseEvent && event.type === 'click') {
      this.toggleOpened();
    }
  }

  public getAnchorId(): string {
    return this.hoverBoxPosition === 'next-tool-icon' ? this.buttonId : 'aurelia-three-toolbar';
  }

  public toggleOpened(): void {
    this.opened = !this.opened;
    this.panel.toggleAttribute('hidden', !this.opened);
    if (this.opened) {
      this.eventAggregator.publish('aurelia-three:toolbar:open-tool', this);
    } else {
      this.eventAggregator.publish('aurelia-three:toolbar:close-tool', this);
    }
  }

  private listenForClose() {
    this.subs.push(this.eventAggregator.subscribe('aurelia-three:toolbar:open-tool', (tool: BaseTool) => {
      if (tool !== this && this.opened) {
        this.toggleOpened();
      }
    }));
  }

}
