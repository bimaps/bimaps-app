import { attr } from "@microsoft/fast-element";
import { FASTElement, customElement, Observable } from '@microsoft/fast-element';
import { IconTemplate as template } from './template';
import { IconStyles as styles } from './styles';

@customElement({name: 'fast-icon', template, styles})
export class FastIcon extends FASTElement {

  public static defaultWeight = 1;
  public static defaultSize = 'lg';

  public connectedCallback(): void {
    super.connectedCallback();
    Observable.getNotifier(FastIcon).subscribe(this, 'solid');
    Observable.getNotifier(FastIcon).subscribe(this, 'outline');
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    Observable.getNotifier(FastIcon).unsubscribe(this, 'solid');
    Observable.getNotifier(FastIcon).unsubscribe(this, 'outline');
  }

  public handleChange(_source: typeof FastIcon, prop: string): void {
    if (prop === this.type) {
      this.setIcon();
    }
  }

  @attr({ mode: 'boolean' })
  public lightweight = false;

  public lightweightChanged(): void {
    this.setIcon();
  }

  @attr({ mode: 'boolean' })
  public accent = false;

  public accentChanged(): void {
    this.setIcon();
  }

  @attr()
  public icon: string;

  public iconChanged(): void {
    this.setIcon();
  }

  private setIcon(): void {
    window.requestAnimationFrame(() => {
      if (!this.shadowRoot ||!this.shadowRoot.querySelector('span')) {
        this.setIcon();
        return;
      }
      const iconSvgContent = this.type === 'solid'
      ? FastIcon.solid[this.icon] || ''
      : FastIcon.outline[this.icon] || '';
      this.shadowRoot.querySelector('span').innerHTML = iconSvgContent;
      const svg = this.shadowRoot.querySelector('svg');
      if (svg instanceof SVGElement) {
        svg.setAttribute('part', 'svg');
        svg.style.width = `${this.sizeInPx()}px`;
        svg.style.height = `${this.sizeInPx()}px`;
      }
      const paths = this.shadowRoot.querySelectorAll('path');

      for (let index = 0; index < paths.length; index++) {
        const path = paths.item(index);
        path.setAttribute('stroke-width', `${this.weight}`);
      }
    });
  }

  @attr()
  public type: 'outline' | 'solid' = 'outline';

  public typeChanged(): void {
    if (this.type !== 'solid' && this.type !== 'outline') {
      this.type = 'outline';
    }
    this.setIcon();
  }

  @attr()
  public weight = FastIcon.defaultWeight;

  public weightChanged(): void {
    this.setIcon();
  }

  @attr()
  public size = FastIcon.defaultSize;

  public sizeChanged(): void {
    this.setIcon();
  }

  // TODO: apply density / design-unit to the size value ??
  private sizeInPx(): number {
    if (parseInt(this.size, 10).toString() === this.size) {
      return parseInt(this.size, 10);
    }
    if (this.size === 'sm' || this.size === 'small') {
      return 16;
    }
    if (this.size === 'md' || this.size === 'medium') {
      return 20;
    }
    if (this.size === 'lg' || this.size === 'large') {
      return 24;
    }
    if (this.size === 'xl' || this.size === 'extra-large') {
      return 28;
    }
    return 24;
  }

  public static solid: {[key: string]: string} = {};
  public static outline: {[key: string]: string} = {};
}
