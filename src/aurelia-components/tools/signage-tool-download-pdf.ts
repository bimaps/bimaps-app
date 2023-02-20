import { SignageTool } from './signage-tool';
import { ThreeSignageModel } from './../../models/signage.model';
import { jsPDF } from 'jspdf';
// https://www.npmjs.com/package/jspdf
// http://raw.githack.com/MrRio/jsPDF/master/docs/jsPDF.html#addFont
// http://raw.githack.com/MrRio/jsPDF/master/docs/index.html => chercher "addFont" dans le contenu


export interface LayoutWrite {
  content: 'items' | 'buildingName' | 'items-left' | 'items-right';    // what should be displayed with this config ?
  displayIcons?: boolean;               // when displaying items, should we also display the icons on the left and right ?
  iconWidth?: number;                   // width of displayed icons, default to 25
  displaySeparator?: boolean | string;  // wether to display separators between items. if `true`, color is same as text, otherwise the string value is the color
  separatorWidth?: number;              // line width of separators
  left: number;                         // starting position of writing from the left edge
  top: number;                          // starting position of writing from the top edge
  width: number;                        // width of the writing area
  fontName: string;                     // font name to be used for this writing
  fontStyle: string;                    // font style to be used for this writing
  fontSize: number;                     // font size to be used for this writing
  lineHeight: number;                   // line height to be used for this writing
  color?: string;                        // color to be used for this writing (default to black)
}

export interface Layout {
  label: string;
  value: string;
  color: string;                        // color of the signage on the map
  size: [number, number];
  orientation: 'portrait' | 'landscape';
  writes?: LayoutWrite[];
  writeSignageOverride?: (doc: jsPDF, signage: ThreeSignageModel) => void;
}

export class SignageToolDownloadPDF {

  public static getLevel(signage: ThreeSignageModel): string {
    return signage.storey;
  }

  public static getGabaritUrl(signage: ThreeSignageModel, layout: Layout, level: string): string {
    return '';
  }
  
  public async download(signage: ThreeSignageModel): Promise<void> {
    const layout = SignageTool.LayoutsList.find(l => l.value === signage.layout);
    if (!layout) {
      throw new Error('Layout not found');
    }
    // prepare pdf doc using layout informations
    const doc = new jsPDF({
      orientation: layout.orientation,
      unit: 'px',
      format: layout.size,
      compress: false
    });

    // prepare gabarit if provided
    const level = SignageToolDownloadPDF.getLevel(signage);
    const gabaritUrl = SignageToolDownloadPDF.getGabaritUrl(signage, layout, level);
    if (gabaritUrl) {
      const imgElement = await this.imageElementFromUrl(`../../../${gabaritUrl}`);
      doc.addImage(imgElement, 'image/png', 0, 0, (doc as any).getPageWidth(), (doc as any).getPageHeight());
    }

    if (layout.writeSignageOverride) {
      // if a layout has an `writeSignageOverride`, this method will
      // be responsible from writing the content on the signage
      layout.writeSignageOverride(doc, signage);
    } else {
      // if no `writeSignageOverride` is defined on layout,
      // we loop over the `writes` elements and use conventional
      // writing with the settings in the Write items

      for (const write of layout.writes || []) {
        // implement writing text here
        const textColor = write.color || '#000000';
        doc.setFont(write.fontName);
        doc.setFontSize(write.fontSize);
        doc.setTextColor(textColor);

        if (write.content === 'items' || write.content === 'items-left' || write.content === 'items-right') {
          // adjust size according to signage scale factor
          let fontSize = write.fontSize;
          let lineHeight = write.lineHeight;
          if (typeof signage.fontScale === 'number' && signage.fontScale !== -1) {
            fontSize = fontSize * signage.fontScale;
            lineHeight = lineHeight * signage.fontScale;
            doc.setFontSize(fontSize);
          }

          const iconWidth = write.iconWidth || 25;
          const leftLabel = write.displayIcons ? write.left + (iconWidth * 1.2) : write.left;
          const extraLineHeight = lineHeight - fontSize;
          const separatorHeight = write.separatorWidth || 1;
          const iconDiff = fontSize + ((iconWidth - fontSize) / 2);
          let currentYPosition = write.top + fontSize;
          for (let index = 0; index < signage.items.length; index++) {
            const item = signage.items[index];
            if (write.content === 'items-right' && !item.iconRight) {
              continue;
            }
            if (write.content === 'items-left' && item.iconRight) {
              continue;
            }
            if (write.displayIcons && item.iconLeft) {
              const iconUrl = SignageTool.getIconUrl(item.iconLeft)
              const imgElement = await this.imageElementFromUrl(`../../../${iconUrl}`);
              doc.addImage(imgElement, 'image/png', write.left, currentYPosition - iconDiff, iconWidth, iconWidth);
            }
            doc.text(item.label, leftLabel, currentYPosition);
            if (write.displayIcons && item.iconRight) {
              const iconUrl = SignageTool.getIconUrl(item.iconRight)
              const imgElement = await this.imageElementFromUrl(`../../../${iconUrl}`);
              doc.addImage(imgElement, 'image/png', write.left + write.width - (iconWidth * 1.2), currentYPosition - iconDiff, iconWidth, iconWidth);
            }

            if (write.displaySeparator) {
              currentYPosition += extraLineHeight + separatorHeight;
              doc.setDrawColor(write.displaySeparator === true ? textColor : write.displaySeparator);
              doc.setLineWidth(separatorHeight);
              doc.line(write.left, currentYPosition, write.left + write.width, currentYPosition);
            }

            currentYPosition += lineHeight;
          }
        } else if (write.content === 'buildingName') {
          doc.text(signage.building, write.left, write.top);
        }
      }
    }

    doc.save('signage.pdf');
  }

  private async imageElementFromUrl(url: string): Promise<HTMLImageElement> {
    const imgElement = document.createElement('img');
    imgElement.setAttribute('src', url);
    await new Promise<void>((resolve, reject) => {
      imgElement.onload = () => resolve();
      imgElement.onerror = () => reject(new Error('Failed to load gabarit image'));
    });
    return imgElement;
  }
}
