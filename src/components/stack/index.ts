import { customElement, FASTElement, observable } from '@microsoft/fast-element';
import { StackStyles as styles } from './styles';
import { StackTemplate as template } from './template';
import './stack-item.css';

@customElement({
  name: 'fast-stack',
  template,
  styles,
  shadowOptions: {
    mode: 'open'
  }
})
export class FastStack extends FASTElement {

  @observable nodes: Node[];

  public nodesChanged(): void {
    let foundOne = false;
    this.nodes.forEach((node) => {
      if (node instanceof HTMLElement) {
        if (foundOne) {
          node.classList.add('stack-item');
        }
        foundOne = true;
      }
    });
  }

}
