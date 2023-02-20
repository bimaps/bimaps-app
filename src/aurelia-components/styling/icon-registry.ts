import { parse } from 'svg-parser';
import { toHtml } from 'hast-util-to-html'
import { selectAll } from 'hast-util-select'
import { Texture } from 'three';

interface RegisteredIcon {
  name: string;
  svg: string;
  textures: {[key: string]: Texture | Promise<Texture>};
}

export class IconRegistry {

  private static registeredIcons: RegisteredIcon[] = [];

  public static registerIcon(name: string, svg: string): void {
    const currentIndex = IconRegistry.registeredIcons.findIndex(i => i.name === name);
    if (currentIndex !== -1) {
      IconRegistry.registeredIcons[currentIndex].svg = svg;
    } else {
      IconRegistry.registeredIcons.push({name, svg, textures: {}});
    }
  }

  public disposeIcon(name: string): void {
    const currentIndex = IconRegistry.registeredIcons.findIndex(i => i.name === name);
    if (currentIndex !== -1) {
      IconRegistry.registeredIcons.splice(currentIndex, 1);
    }
  }

  public static async getIconTexture(name: string, backgroundColor = 'default', strokeColor = 'default', text = null, textColor = null): Promise<Texture> {
    const currentIndex = IconRegistry.registeredIcons.findIndex(i => i.name === name);
    if (currentIndex === -1) {
      console.warn('IconRegistry: missing icon:', name);
      return null;
    }
    const icon = IconRegistry.registeredIcons[currentIndex];
    const variantKey = `${backgroundColor}.${strokeColor}.${text}.${textColor}`;
    if (!icon.textures[variantKey]) {
      const creatingTexture = IconRegistry.createTexture(icon, backgroundColor, strokeColor, text, textColor);
      icon.textures[variantKey] = creatingTexture;
      creatingTexture.then((computedTexture) => {
        icon.textures[variantKey] = computedTexture;
      });
    }
    return icon.textures[variantKey];
  }

  private static createTexture(icon: RegisteredIcon, backgroundColor?: string, strokeColor?: string, text?: string, textColor?: string): Promise<Texture> {
    const h = parse(icon.svg) as any;
    const all = selectAll('*', h, 'svg');

    for (const node of all) {
      if (typeof node.properties?.class !== 'string') {
        continue;
      }
      if (backgroundColor && node.properties.class.includes('colorize-fill-with-fill')) {
        if (typeof node.properties?.fill === 'string') {
          node.properties.fill = backgroundColor;
        }
      }
      if (strokeColor && node.properties.class.includes('colorize-fill-with-stroke')) {
        if (typeof node.properties?.fill === 'string') {
          node.properties.fill = strokeColor;
        }
      }
      if (backgroundColor && node.properties.class.includes('colorize-stroke-with-fill')) {
        if (typeof node.properties?.stroke === 'string') {
          node.properties.fistrokell = backgroundColor;
        }
      }
      if (strokeColor && node.properties.class.includes('colorize-stroke-with-stroke')) {
        if (typeof node.properties?.stroke === 'string') {
          node.properties.stroke = strokeColor;
        }
      }
      if (text && node.properties.class.includes('text')) {
        node.properties.fill = textColor || strokeColor;
        node.properties.textContent = text;
      }
      
    }

    const newSvg = toHtml(h);
    const canvas = document.createElement("canvas");
    canvas.width = 227;
    canvas.height = 227;
    const ctx = canvas.getContext("2d");

    const img = document.createElement("img");
    img.setAttribute("src", "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(newSvg))) );
    img.setAttribute('width', '227');
    img.setAttribute('height', '227');
    return new Promise<Texture>((resolve, reject) => {
      img.onload = function() {
        document.body.appendChild(img);
        ctx.drawImage(img, 0, 0, 227, 227);
        const texture = new Texture(canvas);
        texture.needsUpdate = true;
        resolve(texture);
      };
      img.onerror = function() {
        reject(new Error('Failed to create a texture'));
      }
    });
  }

}
