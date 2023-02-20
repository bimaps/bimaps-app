import { dateValueConverter, datesValueConverter, numbersValueConverter } from './../value-converters';
import { customElement, FASTElement, observable, attr } from '@microsoft/fast-element';
import { DateFieldStyles as styles } from './styles';
import { DateFieldTemplate as template } from './template';
import { AnchoredRegion } from '@microsoft/fast-foundation';
import { TextFieldAppearance } from '@microsoft/fast-components';

@customElement({
  name: 'fast-date-field',
  template,
  styles
})
export class FastDateField extends FASTElement {

  public static index = 0;

  public pickerElement: AnchoredRegion;
  public calendarIconElement: HTMLElement;
  public textFieldId: string;

  public constructor() {
    super();
    FastDateField.index++;
    this.textFieldId = `date-field-input-${FastDateField.index}`;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (!this.id) {
      this.id = this.textFieldId;
    }
    document.addEventListener('click', this);
    document.addEventListener('touchstart', this);
    document.addEventListener('keydown', this);
    this.disableNativePickerChanged();
  }

  public disconnectedCallback(): void {
    document.removeEventListener('click', this);
    document.removeEventListener('touchstart', this);
    document.removeEventListener('keydown', this);
    this.disableNativePicker = false,
    this.disableNativePickerChanged();
  }

  @attr({mode: "boolean"})
  public disableNativePicker = true;
  public disableNativePickerChanged(): void {
    const inputField = this.shadowRoot.querySelector('fast-text-field');
    if (!inputField?.shadowRoot?.querySelector) {
      return;
    }
    const inputElement = inputField.shadowRoot.querySelector('input');
    if (inputElement instanceof HTMLElement) {
      if (this.disableNativePicker) {
        inputElement.addEventListener('click', this.disablingNativePickerHandler);
        inputElement.addEventListener('touchstart', this.disablingNativePickerHandler);
      } else {
        inputElement.removeEventListener('click', this.disablingNativePickerHandler);
        inputElement.removeEventListener('touchstart', this.disablingNativePickerHandler);
      }
    }
  }

  public disablingNativePickerHandler = (event: Event): void => {
    event.preventDefault();
  }

  /**
     * The disabled state of the date-field.
     *
     * @public
     * @remarks
     * HTML Attribute: disabled
     */
   @attr({ mode: "boolean" })
   public disabled: boolean;
   public disabledChanged(): void {
     this.pickerOpened = false;
   }

   /**
     * See {@link https://www.w3.org/WAI/PF/aria/roles#listbox} for more information
     * @public
     * @remarks
     * HTML Attribute: aria-activedescendant
     */
    @observable
    public ariaActiveDescendant = "";

    /**
     * See {@link https://www.w3.org/WAI/PF/aria/roles#listbox} for more information
     * @public
     * @remarks
     * HTML Attribute: aria-disabled
     */
    @observable
    public ariaDisabled: "true" | "false";

    /**
     * See {@link https://www.w3.org/WAI/PF/aria/roles#listbox} for more information
     * @public
     * @remarks
     * HTML Attribute: aria-expanded
     */
    @observable
    public ariaExpanded: "true" | "false" | undefined;

    @attr value = '';
    valueChanged(): void {
      // console.log('value changed', this.value);
    }

   /**
     * The appearance of the element.
     *
     * @public
     * @remarks
     * HTML Attribute: appearance
     */
    @attr
    public appearance: TextFieldAppearance;

    /**
     * The appearance of the calendar element.
     *
     * @public
     * @remarks
     * HTML Attribute: appearance
     */
     @attr
  @attr({attribute: 'calendar-appearance'}) calendaAppearance: 'lightweight' | 'neutral' = 'lightweight';

  @attr({attribute: 'min-year'}) minYear = new Date().getFullYear() - 50;
  @attr({attribute: 'max-year'}) maxYear = new Date().getFullYear() + 2;
  @attr({attribute: 'min', converter: dateValueConverter}) min: Date | string | undefined = '';
  @attr({attribute: 'max', converter: dateValueConverter}) max: Date | string | undefined = '';
  @attr({attribute: 'disabled-week-days', converter: numbersValueConverter}) disabledWeekDays: number[] = [];
  @attr({attribute: 'disabled-dates', converter: datesValueConverter}) disabledDates: Date[] = [];

  @observable month: number = new Date().getMonth();
  @observable year: number = new Date().getFullYear();

  public togglePicker(): void {
    this.pickerOpened = !this.pickerOpened;
  }
  
  @observable public pickerOpened = false;
  public pickerOpenedChanged(): void {
    this.ariaExpanded = this.pickerOpened ? "true" : "false";
    if (this.pickerElement && this.pickerOpened) {
      this.pickerElement.update();
      // const layer = neutralLayer1.getValueFor(this);
      // fillColor.setValueFor(this.pickerElement, layer);
      if (this.value) {
        this.month = dateValueConverter.fromView(this.value).getMonth();
        this.year = dateValueConverter.fromView(this.value).getFullYear();
      } else {
        this.month = new Date().getMonth();
        this.year = new Date().getFullYear();
      }
    }
  }

  public fieldDateChanged(event: Event): void {
    this.value = (event.target as any)?.value;
    this.$emit('change', this.value, {bubbles: true});
  }

  public dateChanged(event: CustomEvent): void {
    event.stopPropagation();
    this.value = event.detail;
    if (this.pickerOpened) {
      this.pickerOpened = false;
    }
    this.$emit('change', this.value, {bubbles: true});
  }

  public handleEvent(event: Event): void {
    if (event instanceof MouseEvent || event instanceof TouchEvent) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const path: Element[] = (event as any).path || event.composedPath()
      if (path.find(el => el === this.pickerElement || el === this.calendarIconElement)) {
        return;
      }
      if (path.find(el => el === this)) {
        if (!this.pickerOpened) {
          this.togglePicker();
        }
        return;
      }
      if (this.pickerOpened) {
        this.pickerOpened = false;
      }
    } else if (event instanceof KeyboardEvent) {
      if (event.key === 'Escape' && this.pickerOpened) {
        this.pickerOpened = false;
      }
    }
  }

}
