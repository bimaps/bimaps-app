import { html, repeat, ref } from '@microsoft/fast-element';
import { FastCalendar, FastCalendarDay } from './index';
import { format } from '../dates';

export const CalendarTemplate = html<FastCalendar>`
<div class="header" part="header">

  <fast-select class="month-control" part="month-control" @change="${(x, c) => x.month = (c.event as CustomEvent).detail.value}" ${ref('monthSelector')}>
    ${repeat(x => x.monthNumbers, html<number, FastCalendar>`
      <fast-option value="${x => x}" ?selected="${(x, c) => x === c.parent.month}">
      ${(x, c) => format(new Date(c.parent.year, x, 1, 0, 0, 0, 0), 'MMMM', c.parent)}
      </fast-option>
    `)}
  </fast-select>

  <fast-select class="year-control" part="year-control" @change="${(x, c) => x.year = (c.event as CustomEvent).detail.value}" ${ref('yearSelector')}>
    ${repeat(x => x.years, html<number, FastCalendar>`
      <fast-option value="${x => x}" ?selected="${(x, c) => x === c.parent.year}">
      ${(x) => x}
      </fast-option>
    `)}
  </fast-select>

  <fast-button @click="${x => x.month = x.month - 1}">
    <fast-icon icon="ChevronLeft"></fast-icon>
  </fast-button>
  <fast-button @click="${x => x.month = x.month + 1}">
    <fast-icon icon="ChevronRight"></fast-icon>
  </fast-button>
</div>
<div class="weekdays" part="weekdays">
${repeat(x => x.days.slice(0, 7), html<FastCalendarDay, FastCalendar>`
  <span>${(x, c) => format(x.date, 'EEEEE', (c.parent))}</span>
`)}
</div>
<div class="days" part="days">
  ${repeat(x => x.days, html<FastCalendarDay, FastCalendar>`  
    <fast-button 
      class="day ${x => x.selected ? 'selected' : ''} ${x => x.today ? 'today' : ''} day-${x => x.weekday} ${x => x.currentMonth ? 'current-month':''}" 
      appearance="${(x, c) => x.selected ? 'accent' : c.parent.appearance}"
      ?disabled="${x => x.disabled}"
      @click="${(x, c) => c.parent.selectDay(x.date)}">
        <span>${x => x.number}</span>
      </fast-button>
  `)}
</div>
`;
