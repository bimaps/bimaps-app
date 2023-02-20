/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { format as originalFormat } from 'date-fns'
import { enUS } from 'date-fns/locale';
import { DesignToken } from '@microsoft/fast-foundation';

export class DateLocale {

  code: string;
  locale: any;

  public constructor(locale: any) {
    this.code = locale.code;
    this.locale = locale;
  }

  public createCSS(): string {
    return this.code;
  }
}

const enUSLocale = new DateLocale(enUS);
export const dateLocale = DesignToken.create<DateLocale>('date-locale').withDefault(enUSLocale);

export function format(date: Date, formatString = 'PP', element: HTMLElement): string {
  const locale = dateLocale.getValueFor(element || document.body);
  return originalFormat(date, formatString, {locale: locale.locale});
}
