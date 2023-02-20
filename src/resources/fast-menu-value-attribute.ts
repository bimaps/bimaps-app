import { customAttribute, bindingMode, bindable, inject, TaskQueue } from 'aurelia-framework';
import { MenuItem } from '@microsoft/fast-components';


/*
This custom attribute is designed to work with <fast-menu> and <fast-menu-item> elements. It will automatically
add the right role ("menuitemcheckbox" or "menuitemradio") according to the bound value type in the menu element

Usage for multiple selection (checkbox)

ViewModel:
- The ViewModel must hold a property (exemple `value` which is in an array form: this.value = [])

View:
<fast-menu fast-menu-value.bind="value">
  <fast-menu-item fast-menu-item-value="value1">Value 1</fast-menu-item>
  <fast-menu-item fast-menu-item-value="value2">Value 2</fast-menu-item>
  <fast-menu-item fast-menu-item-value="value3">Value 3</fast-menu-item>
</fast-menu>

Usage for single selection (radio)

ViewModel:
- The ViewModel must hold a property (exemple `value` which is not an array: this.value = 'default_value')

View:
<fast-menu fast-menu-value.bind="value">
  <fast-menu-item fast-menu-item-value="default_value">Default value</fast-menu-item>
  <fast-menu-item fast-menu-item-value="other_value">Other value</fast-menu-item>
  <fast-menu-item fast-menu-item-value="another_value">Another value</fast-menu-item>
</fast-menu>

*/

@customAttribute('fast-menu-value', bindingMode.twoWay, ['fast-menu-container'])
@inject(Element, TaskQueue)
export class FastMenuValueAttribute {

  public value: any | any[];

  private isMultiple: boolean = false;
  private items: Array<MenuItem & {value?: any}> = [];

  private isQueued: boolean = false;

  constructor(private element: Element, private taskQueue: TaskQueue) {
  }

  /* Event passed on the click eventListener */
  public handleEvent(event: Event) {
    if (event.type === 'change') {
      setTimeout(() => {
        this.computeValueFromItems();
      }, 50)
    }
  }

  /* Callback passed on the TaskQueue when registering child items */
  public call() {
    this.isQueued = false;
    this.applyValueToItems();
  }

  public bind() {
    this.valueChanged(this.value);
  }

  private requestProcessValue() {
    if (!this.isQueued) {
      this.isQueued = true;
      this.taskQueue.queueMicroTask(this);
    }
  }

  public registerMenuItem(option: MenuItem) {
    this.items.push(option);
    option.addEventListener('change', this);
    this.requestProcessValue();
  }

  public disposeMenuItem(option: MenuItem) {
    const index = this.items.indexOf(option);
    if (index !== -1) {
      option.removeEventListener('change', this);
      this.items.splice(index, 1);
      this.requestProcessValue();
    }
  }

  public valueChanged(newValue: string | string[]) {
    this.isMultiple = Array.isArray(newValue);
    // By using requestProcessValue we avoid too many
    // process in case the value changes quickly
    // This can happen if the value type must be fixed (above)
    // or if there are several choice registration in a row
    this.requestProcessValue();
  }


  public applyValueToItems() {
    this.setRolesAccordingToValueType();
    const itemsLength = this.items.length;
    if (this.isMultiple && Array.isArray(this.value)) {
      for (let index = 0; index < itemsLength; index++) {
        const item = this.items[index];
        item.toggleAttribute('checked', this.value.indexOf(item.value) !== -1);
      }
    } else if (!this.isMultiple && typeof this.value === 'string') {
      for (let index = 0; index < itemsLength; index++) {
        const item = this.items[index];
        item.toggleAttribute('checked', this.value === item.value);
      }
    }
  }

  public computeValueFromItems() {
    const itemsLength = this.items.length;
    const newValue: any[] = [];
    for (let index = 0; index < itemsLength; index++) {
      const checked = this.items[index].hasAttribute('checked');
      if (!checked) {
        continue;
      }
      if (!this.isMultiple) {
        this.value = this.items[index].value;
        return;
      } else {
        newValue.push(this.items[index].value);
      }
    }
    if (this.isMultiple) {
      this.value.splice(0, this.value.length);
      this.value.push(...newValue);
    } else {
      this.value = undefined;
    }
  }

  private setRolesAccordingToValueType(): void {
    const role = this.isMultiple ? "menuitemcheckbox" : "menuitemradio";
    for (const item of this.items) {
      item.setAttribute('role', role);
    }
  }

}
