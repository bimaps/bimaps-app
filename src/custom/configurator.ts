import { ImporterService, FileToImport } from './../aurelia-components/importer';
import { SearchTool } from './../aurelia-components/tools/search-tool';
import { ThreeSignageModel } from './../models/signage.model';
import { SignageToolDownloadPDF, Layout, LayoutWrite } from './../aurelia-components/tools/signage-tool-download-pdf';
import { SignageTool} from './../aurelia-components/tools/signage-tool';
import { RulesTool} from './../aurelia-components/tools/rules-tool';
import { SceneTool} from './../aurelia-components/tools/scene-tool';
import { SiteManager } from '../aurelia-components/site-manager';
import { ConeGeometry, SphereGeometry, CylinderGeometry } from 'three';
import Cafe from '../custom/icons/Cafe';

import { IconRegistry } from '../aurelia-components/styling/icon-registry';
import { GeometryRegistry } from '../aurelia-components/styling/geometry-registry';
import { Parser } from 'aurelia-resources';

// As per jsPDF doc (http://raw.githack.com/MrRio/jsPDF/master/docs/index.html)
// this font below has been generated with https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html
// by simply "importing" it, it makes it available with fontName "HelveticaNeue" and fontStyle "normal"
import './fonts/HelveticaNeue-normal';

SiteManager.getIdentifier = (object) => {
  const ifcType = object.userData?.properties?.type;
  let propertyIdentifier = ['globalId'];
  if (ifcType === 'IFCBUILDING') {
    return object.userData?.properties?.name || 'building';
  } else if (ifcType === 'IFCSITE') {
    return 'site'; // the idea is that all data belong to the currently selected site
  } else if (ifcType === 'IFCBUILDINGSTOREY') {
    const name = object.userData?.properties?.name || '';
    const buildingName = object.userData.building || object.parent?.userData.properties?.name || 'building';
    return `${buildingName}:${name}`;
  }
  for (const idProperty of propertyIdentifier) {
    const identifier = object.userData?.properties ? object.userData.properties[idProperty] : undefined;
    if (identifier) {
      return `${ifcType}:${identifier}`;
    }
  }
  return undefined;
}

const collaboratorLabelTemplate = '#{object:userData.pset.Données.properties.Prénom (em).value} ' + '#{object:userData.pset.Données.properties.Nom de famille (em).value}';
const departmentLabelTemplate = '#{object:userData.pset.Données.properties.Departement (rm).value}';
const spaceLabelTemplate = '#{object:userData.properties.name}';
SearchTool.configs = [
  // Add a collaborator search config
  {
    ifcType: 'IFCBUILDINGELEMENTPROXY',
    name: "Collaborateurs",
    properties: [
      'userData.properties.firstname',
      'userData.properties.lastname',
      'userData.properties.name',
      'userData.pset.Données.properties.Prénom (em).value',
      'userData.pset.Données.properties.Nom de famille (em).value'
    ],
    operator: 'or',
    nameTemplate: collaboratorLabelTemplate,
    subnameTemplate: "",
  },
  // Add a space search config
  {
    ifcType: 'IFCSPACE',
    name: "Spaces",
    properties: [
      'userData.properties.firstname',
      'userData.properties.lastname',
      'userData.properties.name',
    ],
    operator: 'or',
    nameTemplate: spaceLabelTemplate,
    subnameTemplate: '',
  }
];

IconRegistry.registerIcon('Cafe', Cafe);

GeometryRegistry.registerGeometry('cone', new ConeGeometry(0.5, 1.8, 32));
GeometryRegistry.registerGeometry('sphere', new SphereGeometry( 0.5, 32, 16 ));
let mate = new CylinderGeometry( 0.2, 0.3, 1.8, 32 );
GeometryRegistry.registerGeometry('mate', mate);

// Load Tree GLTF
// GeometryRegistry.registerGltf('tree', '../../../images/tree.gltf')
let tree = new CylinderGeometry( 0.2, 4, 15, 32 );
GeometryRegistry.registerGeometry('tree', tree);

ImporterService.guessImportFileSettings = (file: FileToImport): void => {
  file.settings.context = file.name.slice(0, 4) === 'GIS_' ? 'gis' : 'bim';
  file.settings.includePsets = file.name.slice(0, 7) === 'BIM_FM_'
  file.settings.flatten = file.name.includes('FLAT');
  file.settings.ignoreBuildings = file.name.includes('GIS_') && !file.name.includes('GIS_BUILDING_') && !file.settings.flatten;
  file.settings.includeSiteObjects = file.name.includes('GIS_') && !file.name.includes('GIS_BUILDING_');
}

ImporterService.sortImportFilesBeforeImport = (files: FileToImport[]): void => {
  files.sort((a, b) => {
    // first sort by context
    if (a.settings.context === 'gis' && b.settings.context === 'bim') {
      return -1;
    } else if (a.settings.context === 'bim' && b.settings.context === 'gis') {
      return 1;
    }
    // if context is identical, sort by includeSiteObjects or not
    if (a.settings.includeSiteObjects && !b.settings.includeSiteObjects) {
      return -1;
    } else if (!a.settings.includeSiteObjects && b.settings.includeSiteObjects) {
      return 1;
    }
    // if includeSiteObjects is identical, sort by includePsets
    if (!a.settings.includePsets && b.settings.includePsets) {
      return -1;
    } else if (a.settings.includePsets && !b.settings.includePsets) {
      return 1;
    }
    return 0;
  });
}

SignageTool.IconsList = [
  {label: 'Bottom Left', value: 'bottom-left'},
  {label: 'Bottom Right', value: 'bottom-right'},
  {label: 'Bottom', value: 'bottom'},
  {label: 'Left', value: 'left'},
  {label: 'Right', value: 'right'},
  {label: 'Top Left', value: 'top-left'},
  {label: 'Top Right', value: 'top-right'},
  {label: 'Top', value: 'top'},
];

SignageTool.getIconUrl = (iconValue) => `signage/arrows/${iconValue}.png`;

const writingItem1: LayoutWrite = {
  content: 'items',
  displayIcons: true,
  iconWidth: 30,
  displaySeparator: '#00ff00',
  separatorWidth: 4,
  fontName: 'Courier',
  fontStyle: 'BoldOblique',
  fontSize: 18,
  lineHeight: 24,
  color: '#ff0000',
  left: 150,
  top: 600,
  width: 500
};

const writingItemLeft: LayoutWrite = {
  content: 'items-left',
  displayIcons: true,
  iconWidth: 20,
  displaySeparator: true,
  separatorWidth: 4,
  fontName: 'Helvetica',
  fontStyle: '',
  fontSize: 12,
  lineHeight: 14,
  color: '#000000',
  left: 100,
  top: 0,
  width: 350
};

const writingItemRight: LayoutWrite = {
  content: 'items-right',
  displayIcons: true,
  iconWidth: 20,
  displaySeparator: true,
  separatorWidth: 4,
  fontName: 'HelveticaNeue',
  fontStyle: 'normal',
  fontSize: 12,
  lineHeight: 14,
  color: '#000000',
  left: 500,
  top: 100,
  width: 350
};

const writingBuildingName1: LayoutWrite = {
  content: 'buildingName',
  fontName: 'Helvetica',
  fontStyle: '',
  fontSize: 20,
  lineHeight: 24,
  color: '#0000ff',
  left: 300,
  top: 300,
  width: 300
};

SignageTool.LayoutsList = [
  // {value: '12x17V-salle', label: 'Portes salle (12x17V)', color: '#0F6A70', size: [443, 593], orientation: 'portrait', writeSignageOverride: () => {
  //   // custom code pour écrire comme on veut
  //   // deux colones
  // }},
  {value: '12x17V-salle', label: 'Portes salle (12x17V)', color: '#0F6A70', size: [443, 593], orientation: 'portrait', writes: [writingItem1]},
  {value: '12x17V-bureau', label: 'Portes bureau (12x17V)', color: '#0F6A70', size: [443, 593], orientation: 'portrait', writes: [writingItem1]},
  {value: '50x60V', label: '50x60 Vertical', color: '#AD0101', size: [1551, 1976], orientation: 'portrait', writes: [writingItem1]},
  {value: 'A2-V', label: 'A2 V', color: '#AD0101', size: [1304, 1834], orientation: 'portrait', writes: [writingItem1, writingBuildingName1]},
  {value: 'A2+', label: 'A2+', color: '#AD0101', size: [1304, 1834], orientation: 'portrait', writes: [writingItem1, writingBuildingName1]},
  {value: 'A3-V-bureau', label: 'A3 V bureau', color: '#DAA520', size: [967, 1276], orientation: 'portrait', writes: [writingItem1]},
  {value: 'A3-H-1col', label: 'A3 H 1 colonne', color: '#DAA520', size: [1316, 976], orientation: 'landscape', writes: [writingItem1]},
  {value: 'A3-H-2col', label: 'A3 H 2 colonnes', color: '#DAA520', size: [1316, 976], orientation: 'landscape', writes: [writingItemLeft, writingItemRight]},
  {value: 'A4-H-1col', label: 'A4 H 1 colonne', color: '#003366', size: [959, 712], orientation: 'portrait', writes: [writingItem1]},
  {value: 'A4-H-2col', label: 'A4 H 2 colonnes', color: '#003366', size: [959, 712], orientation: 'portrait', writes: [writingItem1]},
  {value: 'A4+H-1col', label: 'A4+ 1 colonne', color: '#003366', size: [1024, 712], orientation: 'landscape', writes: [writingItem1]},
  {value: 'A4+H-2col', label: 'A4+ 2 colonnes', color: '#003366', size: [1024, 712], orientation: 'landscape', writes: [writingItem1]},
  {value: 'A5-H-bureau', label: 'A5 H bureau', color: '#4682B4', size: [712, 531], orientation: 'landscape', writes: [writingItem1]},
  {value: 'A6-V-bureau', label: 'A6 V bureau', color: '#4682B4', size: [409, 531], orientation: 'portrait', writes: [writingItem1]},
  {value: '148x80H', label: '148x80 H', color: '', size: [842, 595], orientation: 'landscape', writes: [writingItem1]}
];

/*
Font List
{
    "helvetica": [
        "normal",
        "bold",
        "italic",
        "bolditalic"
    ],
    "Helvetica": [
        "",
        "Bold",
        "Oblique",
        "BoldOblique"
    ],
    "courier": [
        "normal",
        "bold",
        "italic",
        "bolditalic"
    ],
    "Courier": [
        "",
        "Bold",
        "Oblique",
        "BoldOblique"
    ],
    "times": [
        "normal",
        "bold",
        "italic",
        "bolditalic"
    ],
    "Times": [
        "Roman",
        "Bold",
        "Italic",
        "BoldItalic"
    ],
    "zapfdingbats": [
        "normal"
    ],
    "ZapfDingbats": [
        ""
    ],
    "symbol": [
        "normal"
    ],
    "Symbol": [
        ""
    ]
}
*/


SignageTool.getObjectsOnSameLevel = (signage: ThreeSignageModel, siteManager: SiteManager) => {
  const building = siteManager.siteObject.children.find((o) => {
    const name = o.userData.properties?.name || 'Building';
    return o.userData.properties?.type === 'IFCBUILDING' && name === signage.building
  });
  if (!building) {
    return [];
  }
  const collaborators: string[] = [];
  const spaces: string[] = [];
  const services: string[] = [];
  building.traverse(object => {
    if (object.userData.storey !== signage.storey) {
      return;
    }
    const isProxy = object.userData.properties?.type === 'IFCBUILDINGELEMENTPROXY';
    const isCollaborator = isProxy && object.userData.properties?.name?.includes('Collaborateur');
    if (isCollaborator) {
      const label = Parser.parseTemplate(collaboratorLabelTemplate, {object});
      collaborators.push(label);
      return;
    }
    const isSpace = object.userData.properties?.type === 'IFCSPACE';
    if (isSpace) {
      const label = Parser.parseTemplate(spaceLabelTemplate, {object});
      if (!spaces.includes(label)) {
        spaces.push(label);
      }
      const departmentLabel = Parser.parseTemplate(departmentLabelTemplate, {object});
      if (!services.includes(departmentLabel)) {
        services.push(departmentLabel);
      }
    }
  });
  return collaborators.concat(...services).concat(...spaces);
}

SignageToolDownloadPDF.getLevel = (signage: ThreeSignageModel): string => {
  let storey = signage.storey;
  if (storey === 'Rez -12') {
    return '0';
  }
  storey = storey.replace('P', '');
  const isNegative = storey.includes('S');
  storey = storey.replace('S', '');
  const storeyNumber = parseInt(storey) * (isNegative ? -1 : 1);
  return `${storeyNumber}`;
}

SignageToolDownloadPDF.getGabaritUrl = (signage: ThreeSignageModel, layout: Layout, level: string): string => {
  return `signage/${layout.value}/gabarit-${level}.png`;
}
