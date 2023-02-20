import { html, ref } from '@microsoft/fast-element';
import { FastDateField } from './index';

export const DateFieldTemplate = html<FastDateField>`
<template
  role="combobox"
  tabindex="${x => (!x.disabled ? "0" : null)}"
  aria-disabled="${x => x.ariaDisabled}"
  aria-expanded="${x => x.ariaExpanded}"
  >

  <fast-text-field
    class="control hide-picker-indicator"
    part="control" 
    type="date"
    :value="${x => x.value}"
    ?disabled="${x => x.disabled}"
    :appearance="${x => x.appearance}"
    @change="${(x, c) => x.fieldDateChanged(c.event as CustomEvent)}"
    >
    <ecos-icon class="calendar-icon" part="calendar-icon" icon="Calendar" slot="end" @click="${x => x.togglePicker()}" ${ref('calendarIconElement')}></ecos-icon>
  </fast-text-field>
  <fast-anchored-region
    ${ref('pickerElement')} 
    ?hidden="${x => !x.pickerOpened}"
    class="picker"
    part="picker"
    anchor="${x => x.id || x.textFieldId}"
    auto-update-mode="auto"
    vertical-positioning-mode="locktodefault"
    vertical-threshold="100"
    vertical-default-position="bottom"
    horizontal-default-position="left"
    horizontal-inset="true"
    horizontal-positioning-mode="locktodefault"
    >
    <fast-calendar
      class="calendar"
      part="calendar"
      :date="${x => x.value}"
      :month="${x => x.month}"
      :year="${x => x.year}"
      :appearance="${x => x.calendaAppearance}"
      :min="${x => x.min}"
      :max="${x => x.max}"
      :minYear="${x => x.minYear}"
      :maxYear="${x => x.maxYear}"
      :disabledWeekDays="${x => x.disabledWeekDays}"
      :disabledDates="${x => x.disabledDates}"
      @change="${(x, c) => x.dateChanged(c.event as CustomEvent)}"
      ></fast-calendar>
  </fast-anchored-region>
</template>
`;
