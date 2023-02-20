import { 
  provideFASTDesignSystem, 
  fastAccordion,
  fastAccordionItem,
  fastAnchoredRegion,
  fastButton,
  fastCard, 
  fastCheckbox,
  fastMenu,
  fastMenuItem,
  fastTextField,
  fastBreadcrumb,
  fastBreadcrumbItem,
  fastSelect,
  fastSlider,
  buttonStyles,
  accentFillHover,
  foregroundOnAccentHover,
  accentFillFocus,
  foregroundOnAccentFocus,
  fastOption,
  fastDialog,
  fastTab,
  fastTabs,
  fastTabPanel,
  fastSwitch,
  fastBadge,
  fastProgressRing,
  fastAnchor,
} from '@microsoft/fast-components';
import { css } from '@microsoft/fast-element';
import { focusVisible } from '@microsoft/fast-foundation';
import { FastIcon } from './components/icon';

export const iconButtonStyles = css`
:host([icon]) {
  width: 40px;
  height: 40px;
}
/*
:host([appearance=lightweight][hover-fill]) .control {
  padding: 0 calc((10 + max(0, calc(var(--control-corner-radius) - 10)) + (var(--design-unit) * 2 * max(var(--density), 0))) * 1px);
}
*/
:host([icon]) .control {
  padding: 0;
}
:host([icon]) .content {
  display: flex;
}
:host([appearance=lightweight][icon]) span.content::before,
:host([appearance=lightweight][hover-fill]) span.content::before,
:host([appearance=lightweight][icon]) .control:${focusVisible} span.content::before,
:host([appearance=lightweight][hover-fill]) .control:${focusVisible} span.content::before {
  background: transparent;
}
:host([appearance=lightweight][icon]:hover),
:host([appearance=lightweight][hover-fill]:hover) {
  background: ${accentFillHover};
  color: ${foregroundOnAccentHover};
}
:host([appearance=lightweight][icon]:focus),
:host([appearance=lightweight][hover-fill]:focus) {
  background: ${accentFillFocus};
  color: ${foregroundOnAccentFocus};
}
`;

provideFASTDesignSystem()
    .register(
        fastAccordion(),
        fastAccordionItem(),
        fastAnchor(),
        fastAnchoredRegion(),
        fastBadge(),
        fastBreadcrumb(),
        fastBreadcrumbItem(),
        fastButton({
          styles: (ctx, def) => css`
            ${buttonStyles(ctx, def as any)}
            ${iconButtonStyles}
          `
        }),
        fastCard(),
        fastCheckbox(),
        fastDialog(),
        fastMenu(),
        fastMenuItem(),
        fastOption(),
        fastProgressRing(),
        fastSelect(),
        fastSlider(),
        fastSwitch(),
        fastTab(),
        fastTabs(),
        fastTabPanel(),
        fastTextField()
    );

FastIcon;

// import global custom components
import { fastTextFieldLogin } from './components/text-field-login';
import { confirmDialog } from './components/dialogs/confirm';
import { selectDialog } from './components/dialogs/select';
import { promptTextDialog } from './components/dialogs/prompt-text';
provideFASTDesignSystem()
    .register(
      fastTextFieldLogin(),
      confirmDialog({}),
      selectDialog({}),
      promptTextDialog({}),
    );

// import local custom components
import { adjustTranslationRotationDialog } from './aurelia-components/tools/dialogs/adjust-translation-rotation';
import { editSignageItemDialog } from './aurelia-components/tools/dialogs/edit-signage-item';
provideFASTDesignSystem()
    .register(
      adjustTranslationRotationDialog({}),
      editSignageItemDialog({}),
    );

// import components with the old syntax
import { FastStack } from './components/stack';
import { FastNext } from './components/next';
import { FastCalendar } from './components/calendar/index';
import { FastFormRow } from './components/form-row/index';
import { FastForm } from './components/form/index';
import { FastDateField } from 'components/date-field';

FastStack;
FastNext;
FastForm;
FastFormRow;
FastCalendar;
FastDateField
