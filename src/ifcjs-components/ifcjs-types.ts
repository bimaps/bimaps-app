import * as WEBIFC from 'web-ifc';

interface Types {[key: number]: string};
export const IfcTypesMap: Types = [];

function setTypes(): void {

  for (const key in WEBIFC) {
    if (key.indexOf('IFC') === 0 && typeof WEBIFC[key] === 'number') {
      IfcTypesMap[WEBIFC[key]] = key;
    }
  }
}

setTypes();