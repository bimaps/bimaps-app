import { FastMenuValueAttribute } from './fast-menu-value-attribute';
import { customAttribute, inject, observable, Optional } from 'aurelia-framework';
import { MenuItem } from '@microsoft/fast-components';

@customAttribute('fast-menu-item-value', undefined, ['fast-menu-option'])
@inject(Element, Optional.of(FastMenuValueAttribute))
export class FastMenuItemValueAttribute {

  public value: any;

  constructor(private element: MenuItem & {value?: any}, private container: FastMenuValueAttribute) {}

  public bind() {
    this.container.registerMenuItem(this.element);
    this.element.value = this.value;
  }

  public detached() {
    this.container.disposeMenuItem(this.element);
  }

  public valueChanged(newValue: any) {
    this.element.value = newValue;
    this.container.computeValueFromItems();
  }
}
