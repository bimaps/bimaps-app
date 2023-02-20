import { customElement, FASTElement, observable, attr, nullableNumberConverter } from '@microsoft/fast-element';
import { Select } from '@microsoft/fast-foundation';
import { CalendarStyles as styles } from './styles';
import { CalendarTemplate as template } from './template';
import { startOfWeek, startOfMonth, isEqual, getWeek, startOfDay, isAfter, isBefore } from 'date-fns';
import { dateValueConverter, datesValueConverter, numbersValueConverter } from '../value-converters';

export interface FastCalendarDay {
  number: number;
  date: Date;
  selected: boolean;
  disabled: boolean;
  today: boolean;
  week: number;
  weekday: number;
  currentMonth: boolean;
}

@customElement({
  name: 'fast-calendar',
  template,
  styles
})
export class FastCalendar extends FASTElement {

  public connectedCallback(): void {
    super.connectedCallback();
  }

  public monthSelector: Select;
  public yearSelector: Select;

  @observable days: FastCalendarDay[] = [];

  @attr({attribute: 'disabled-week-days', converter: numbersValueConverter}) disabledWeekDays: number[] = [];
  public disabledWeekDaysChanged(): void {
    this.setDays();
  }

  @attr({converter: dateValueConverter}) min: Date | undefined;
  public minChanged(): void {
    this.setDays();
  }

  @attr({converter: dateValueConverter}) max: Date | undefined;
  public maxChanged(): void {
    this.setDays();
  }

  @attr({attribute: 'disabled-dates', converter: datesValueConverter}) disabledDates: Date[] = [];
  public disabledDatesChanged(): void {
    if (!Array.isArray(this.disabledDates)) {
      this.disabledDates = [];
    }
    if (this.disabledDates.some(s => !this.isStartOfDay(s))) {
      this.disabledDates = this.disabledDates.map(s => startOfDay(s));
    }
    this.setDays();
  }
  
  @attr({converter: nullableNumberConverter}) month: number = new Date().getMonth();
  public monthChanged(): void {
    if (this.month < 0) {
      this.month = 11;
      this.year -= 1;
      return;
    } else if (this.month > 11) {
      this.month = 0;
      this.year += 1;
      return;
    }
    if (this.monthSelector) {
      this.monthSelector.selectedIndex = this.month;
    }
    this.setDays();
  }

  @attr({converter: nullableNumberConverter}) year: number = new Date().getFullYear();
  public yearChanged(): void {
    if (this.year > this.maxYear) {
      this.maxYear = this.year;
    }
    if (this.year < this.minYear) {
      this.minYear = this.year;
    }
    if (this.yearSelector) {
      const index = this.yearSelector.options.findIndex(o => o.value === `${this.year}`);
      this.yearSelector.selectedIndex = index;
    }
    this.setDays();
  }

  @attr mode: 'single' | 'multiple' | 'range' = 'single';
  public modeChanged(): void {
    this.setDays();
  }

  /**
   * Selected date when mode === 'single'
   */
  @attr({converter: dateValueConverter}) date: Date | undefined = undefined;
  public dateChanged(): void {
    if (!this.date || this.isStartOfDay(this.date)) {
      if (this.date) {
        this.month = this.date.getMonth();
        this.year = this.date.getFullYear();
      }
      this.setDays();
    } else {
      this.date = startOfDay(this.date);
    }
  }
  
  /**
   * Selected dates when mode === 'multiple'
   */
  @attr({converter: datesValueConverter}) dates: Date[] = [];
  public datesChanged(): void {
    if (this.dates.some(s => !this.isStartOfDay(s))) {
      this.dates = this.dates.map(s => startOfDay(s));
    }
    this.setDays();
  }

  /**
   * Selected range when mode === 'range'
   */
  @attr({converter: dateValueConverter}) from: Date | undefined = undefined;
  public fromChanged(): void {
    if (!this.from || this.isStartOfDay(this.from)) {
      this.setDays();
    } else {
      this.from = startOfDay(this.from);
    }
  }
  @attr({converter: dateValueConverter}) end: Date | undefined = undefined;
  public endChanged(): void {
    if (!this.end || this.isStartOfDay(this.end)) {
      this.setDays();
    } else {
      this.end = startOfDay(this.end);
    }
  }

  @attr({attribute: 'appearance'}) appearance: 'lightweight' | 'neutral' = 'lightweight';

  @attr({attribute: 'min-year'}) minYear = new Date().getFullYear() - 50;
  @attr({attribute: 'max-year'}) maxYear = new Date().getFullYear() + 2;

  public monthNumbers = [0,1,2,3,4,5,6,7,8,9,10,11];

  public get years(): number[] {
    const list: number[] = [];
    for (let i = this.minYear; i <= this.maxYear; i++) {
        list.push(i);
    }
    return list;
  }

  private isStartOfDay(date: Date): boolean {
    return date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0
  }

  private setDays(): void {
    // use splice to empty the array so that the subscribers are notified
    this.days.splice(0, this.days.length);
  
    const source = startOfDay(new Date());
    source.setFullYear(this.year, this.month + 1, 0);
    const month = source.getMonth();
    const start = startOfWeek(startOfMonth(source), {weekStartsOn: 1});

    const current = new Date(start);
    const today0 = startOfDay(new Date());
    while (this.days.length < 50) {
      if (this.days.length > 28 && this.days.length % 7 === 0) {
        if (current.getMonth() !== month) {
          break;
        }
      }

      this.days.push({
        number: current.getDate(),
        date: new Date(current),
        selected: this.isSelected(current),
        disabled: this.isDisabled(current),
        today: isEqual(today0, current),
        week: getWeek(current),
        weekday: current.getDay(),
        currentMonth: current.getMonth() === month
      });
      current.setDate(current.getDate() + 1);
    }
  }

  private isSelected(date: Date): boolean {
    if (this.mode === 'single' && this.date) {
      return isEqual(this.date, date);
    } else if (this.mode === 'multiple' && this.dates.length > 0) {
      return this.dates.some(s => isEqual(s, date));
    } else if (this.mode === 'range') {
      if (this.from && isEqual(date, this.from)) {
        return true;
      } else if (this.end && isEqual(date, this.end)) {
        return true;
      } else if (this.from && this.end && isAfter(date, this.from) && isBefore(date, this.end)) {
        return true;
      }
    }
    return false;
  }

  private isDisabled(date: Date) {
    const weekDay = date.getDay();
    if ((this.disabledWeekDays || []).some(d => d === weekDay)) {
      return true;
    }
    if (this.min && isBefore(date, this.min)) {
      return true;
    }
    if (this.max && isAfter(date, this.max)) {
      return true;
    }
    if ((this.disabledDates || []).length > 0 && this.disabledDates.some(d => isEqual(d, date))) {
      return true;
    }
    return false;
  }

  public selectDay(date: Date): void {
    date = startOfDay(date);
    if (this.mode === 'single') {
      if (this.date && isEqual(this.date, date)) {
        this.date = undefined;
      } else {
        this.date = date;
      }
    } else if (this.mode === 'multiple') {
      const index = this.dates.findIndex(d => isEqual(d, date));
      if (index !== -1) {
        this.dates.splice(index, 1);
      } else {
        this.dates.push(date);
      }
      this.dates = [].concat(...this.dates);
    } else if (this.mode === 'range') {
      if (!this.from) {
        this.from = date;
      } else if (!this.end) {
        const end = date;
        if (isAfter(end, this.from)) {
          this.end = end;
        } else {
          this.end = this.from;
          this.from = end;
        }
      } else {
        this.from = startOfDay(date);
        this.end = undefined;
      }
    }
    this.emitChange();
  }

  public emitChange(): void {
    if (this.mode === 'single' || this.mode === 'multiple') {
      this.$emit('change', this.mode === 'single'
        ? dateValueConverter.toView(this.date)
        : datesValueConverter.toView(this.dates), {bubbles: true});
    } else if (this.mode === 'range') {
      this.$emit('change', {from: this.from, end: this.end}, {bubbles: true});
    }
  }

}
