import { html, slotted } from '@microsoft/fast-element';
import { FastNext } from './index';

export const NextTemplate = html<FastNext>`
<template>
  <slot part="next-items" ${slotted("items")}></slot>
</template>`;
