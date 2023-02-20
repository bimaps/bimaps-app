import { ValueConverter } from '@microsoft/fast-element';
import { format, parseISO } from 'date-fns';

const date2string = (value: Date | string | undefined): string => {
  if (value instanceof Date && isNaN(value.getTime())) {
    return '';
  }
  if (typeof value === 'string') {
    if (value.length === 10) {
      return value;
    } else {
      value = parseISO(value)
      if (typeof value === 'string') {
        return value;
      }
    }
  }
  return value ? format(value, 'yyyy-MM-dd') : '';
}

export const dateValueConverter: ValueConverter = {
  toView(value: Date | string | undefined): string {
    return date2string(value);
  },
  fromView(value: string | Date): Date | undefined {
    if (value instanceof Date) {
      return value;
    }
    if (!value) {
      return undefined;
    }
    const b = value.split(/\D/).map(s => parseInt(s));
    return new Date(b[0], --b[1], b[2]);
  }
}

export const datesValueConverter: ValueConverter = {
  toView(value: Date[] | undefined): string {
    if (!value || value.length === 0) {
      return '';
    }
    return value.map(v => date2string(v)).filter(v => v).join(',');
  },
  fromView(value: string): Date[] {
    if (Array.isArray(value)) {
      return value.filter(d => d instanceof Date && !isNaN(d.getTime()));
    }
    if (!value) {
      return [];
    }
    return value.split(',').map(v => {
      const b = v.split(/\D/).map(s => parseInt(s));
      return new Date(b[0], --b[1], b[2]);
    });
  }
}

export const numbersValueConverter: ValueConverter = {
  toView(value: number[] | undefined): string {
    if (!value || value.length === 0) {
      return '';
    }
    return value.map(v => v.toString()).join(',');
  },
  fromView(value: string): number[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (!value) {
      return [];
    }
    return value.split(',').map(v => parseFloat(v));
  }
}