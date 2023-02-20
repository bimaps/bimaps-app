import { customElement, FASTElement } from '@microsoft/fast-element';
import { FormStyles as styles } from './styles';
import { FormTemplate as template } from './template';

@customElement({
  name: 'fast-form-row',
  template,
  styles
})
export class FastFormRow extends FASTElement {
  
}
