export * from './three';
export * from './site-manager';

import { FrameworkConfiguration } from 'aurelia-framework';
import { PLATFORM } from 'aurelia-pal';

export function configure(config: FrameworkConfiguration) {
  config.globalResources([
    PLATFORM.moduleName('./three'),
    PLATFORM.moduleName('./tools/parts/import-from-files'),
    PLATFORM.moduleName('./tools/parts/site-objects-stats'),
    PLATFORM.moduleName('./tools/settings-tool'),
    PLATFORM.moduleName('./tools/building-indicator'),
    PLATFORM.moduleName('./tools/camera-tool'),
    PLATFORM.moduleName('./tools/clipping-tool'),
    PLATFORM.moduleName('./tools/filter-tool'),
    PLATFORM.moduleName('./tools/groups-tool'),
    // level indicator is deprecated
    // PLATFORM.moduleName('./tools/level-indicator'),
    PLATFORM.moduleName('./tools/navigation-tool'),
    PLATFORM.moduleName('./tools/object-property-tool'),
    PLATFORM.moduleName('./tools/language-selector-tool'),
    PLATFORM.moduleName('./tools/object-property'),
    PLATFORM.moduleName('./tools/rules-tool'),
    PLATFORM.moduleName('./tools/scene-tool'),
    PLATFORM.moduleName('./tools/search-tool'),
    PLATFORM.moduleName('./tools/select-tool'),
    PLATFORM.moduleName('./tools/signage-tool'),
    PLATFORM.moduleName('./tools/site-navigator-tool'),
    PLATFORM.moduleName('./tools/sites-tool'),
    PLATFORM.moduleName('./tools/spatial-structure-object'),
    PLATFORM.moduleName('./tools/spatial-structure-tool'),
    PLATFORM.moduleName('./tools/themes-tool'),
  ]);
}
