import { html, slotted } from '@microsoft/fast-element';
import { FastStack } from './index';

export const StackTemplate = html<FastStack>`
<template>
  <slot ${slotted('nodes')}></slot>
</template>`;
