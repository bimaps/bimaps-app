import { TextField, textFieldStyles } from '@microsoft/fast-components';
import { attr } from '@microsoft/fast-element';
import { textFieldTemplate as template } from './template';

export class TextFieldLogin extends TextField {

  @attr() public autocomplete = '';
  @attr() public name = '';

}

export const fastTextFieldLogin = TextField.compose({
  baseName: 'text-field-login',
  template,
  styles: textFieldStyles,
  shadowOptions: null
});
