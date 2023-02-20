import { StyleDefinition, StylingService, StyledObject } from './styling-service';
import { Scene, Object3D } from 'three';
import * as resolvePath from 'object-resolve-path';

export interface StyleChecker {
  conditions: StyleCondition[];
  conditionOperator: 'and' | 'or';
  definitions: StyleDefinition[];
  applyToChildren?: boolean;
}

export interface StyleCondition {
  key: string; // use "uuid" to target main "uuid" property and "userData.prop" to target a "prop" key in "userData"
  operator: '=' | '<' | '>' | '!=' | '*';
  value: string | number | Date;
  includeParentsInTestingCondition?: boolean;
}

interface RegisteredStyle {
  name: string,
  checkers: StyleChecker[],
  priority: number,
  active: boolean
}
export class StylingManager {

  constructor(private scene: Scene, private service: StylingService) {}

  private registeredStyles: RegisteredStyle[] = [];
  private keyIndexColors = new Map();

  public getRegisteredStyles(): RegisteredStyle[] {
    return this.registeredStyles;
  }

  public registerStyle(name: string, checkers: StyleChecker[], priority: number, active = true): void {
    this.disposeStyle(name);
    this.registeredStyles.push({name, checkers, priority, active});
    this.registeredStyles.sort((rsA, rsB) => {
      if (rsA.priority > rsB.priority) {
        return 1;
      } else if (rsA.priority < rsB.priority) {
        return -1;
      }
      return 0;
    });
  }

  public disposeStyle(name: string): void {
    const index = this.registeredStyles.findIndex(rs => rs.name === name);
    if (index !== -1) {
      this.registeredStyles.splice(index, 1);
    }
  }

  public deactivateStyle(name: string): void {
    const style = this.registeredStyles.find(rs => rs.name === name);
    if (style) {
      style.active = false;
    }
  }

  public activateStyle(name: string): void {
    const style = this.registeredStyles.find(rs => rs.name === name);
    if (style) {
      style.active = true;
    }
  }

  public apply(objects?: Array<Object3D> | Object3D): void {
    console.log('apply', 'registeredStyles', this.registeredStyles);
    if (objects === undefined) {
      objects = this.scene;
    }
    const childrenDefinitions: {[key: string]: StyleDefinition} = {};
    if (objects instanceof Object3D) {
      objects = [objects];
    }

    for (let rootObject of objects) {
      rootObject.traverse((object) => {
        const o: Object3D = object;
        const currentDefinition: StyleDefinition = {};
        if (childrenDefinitions[object.uuid]) {
          this.augmentDefinition(currentDefinition, childrenDefinitions[object.uuid]);
        }
        for (const registeredStyle of this.registeredStyles) {
          if (registeredStyle.active === false) {
            continue;
          }
          for (const checker of registeredStyle.checkers) {
            if (!this.checkAgainstObject(checker, o)) {
              continue;
            }

            for (const definition of checker.definitions) {
              // if (checker.exclusive) {
              //   this.clearDefinition(currentDefinition)
              // }

              let colorIndex : number = 0;
              let colorKeyValue : string;
              if (object.userData && Object.keys(object.userData).length != 0 && definition.colorByValue && definition.colorByValue != undefined && definition.colorByValueKey){
                try {
                  // colorKeyValue = Parser.parseTemplate( '#{object:' + key + '}', {object});
                  colorKeyValue = resolvePath(object, definition.colorByValueKey);

                  if (colorKeyValue != undefined){
                    if (this.keyIndexColors.has(colorKeyValue) == false){
                      let keyCs : number = this.keyIndexColors.size;
                      let nb : number = definition.colorByValue.length;
                      colorIndex = keyCs - (Math.trunc(keyCs/nb) * nb);
                      this.keyIndexColors.set(colorKeyValue,  definition.colorByValue[colorIndex]); 
                    }
                  }
                } catch (error) {
                }
  
                if (colorKeyValue && this.keyIndexColors && this.keyIndexColors.size > 0){
                 let color = this.keyIndexColors.get(colorKeyValue);
                 definition.color = color;
                }
              }
             

              this.augmentDefinition(currentDefinition, definition);
              if (checker.applyToChildren) {
                // traverse object children to save a future base definition
                o.traverse((child) => {
                  if (child === object) {
                    return;
                  }
                  const uuid = child.uuid;
                  const def: StyleDefinition = childrenDefinitions[uuid] ? childrenDefinitions[uuid] : {};
                  this.augmentDefinition(def, definition);
                  childrenDefinitions[uuid] = def;
                });
              }
              // if (checker.last) {
              //   break;
              // }
            }

          }
        }
        this.service.applyStyle(object, currentDefinition);
      });
    }
  }

  private coerceDefinition(definition: StyleDefinition): void {
    if (typeof definition.opacity === 'string') {
      definition.opacity = parseFloat(definition.opacity);
    }
    if (typeof definition.maxOpacity === 'string') {
      definition.maxOpacity = parseFloat(definition.maxOpacity);
    }

    if (typeof definition.label?.opacity === 'string') {
      definition.label.opacity = parseFloat(definition.label.opacity);
    }
    if (typeof definition.label?.scale === 'string') {
      definition.label.scale = parseFloat(definition.label.scale);
    }
    if (typeof definition.label?.position?.x === 'string') {
      definition.label.position.x = parseFloat(definition.label.position.x);
    }
    if (typeof definition.label?.position?.y === 'string') {
      definition.label.position.y = parseFloat(definition.label.position.y);
    }
    if (typeof definition.label?.position?.z === 'string') {
      definition.label.position.z = parseFloat(definition.label.position.z);
    }

    if (typeof definition.icon?.opacity === 'string') {
      definition.icon.opacity = parseFloat(definition.icon.opacity);
    }
    if (typeof definition.icon?.scale === 'string') {
      definition.icon.scale = parseFloat(definition.icon.scale);
    }
    if (typeof definition.icon?.position?.x === 'string') {
      definition.icon.position.x = parseFloat(definition.icon.position.x);
    }
    if (typeof definition.icon?.position?.y === 'string') {
      definition.icon.position.y = parseFloat(definition.icon.position.y);
    }
    if (typeof definition.icon?.position?.z === 'string') {
      definition.icon.position.z = parseFloat(definition.icon.position.z);
    }

    if (typeof definition.geometry?.scale === 'string') {
      definition.geometry.scale = parseFloat(definition.geometry.scale);
    }
    if (typeof definition.geometry?.position?.x === 'string') {
      definition.geometry.position.x = parseFloat(definition.geometry.position.x);
    }
    if (typeof definition.geometry?.position?.y === 'string') {
      definition.geometry.position.y = parseFloat(definition.geometry.position.y);
    }
    if (typeof definition.geometry?.position?.z === 'string') {
      definition.geometry.position.z = parseFloat(definition.geometry.position.z);
    }
    if (typeof definition.geometry?.rotation?.x === 'string') {
      definition.geometry.rotation.x = parseFloat(definition.geometry.rotation.x);
    }
    if (typeof definition.geometry?.rotation?.y === 'string') {
      definition.geometry.rotation.y = parseFloat(definition.geometry.rotation.y);
    }
    if (typeof definition.geometry?.rotation?.z === 'string') {
      definition.geometry.rotation.z = parseFloat(definition.geometry.rotation.z);
    }

    if (typeof definition.bbox?.opacity === 'string') {
      definition.bbox.opacity = parseFloat(definition.bbox.opacity);
    }
    if (typeof definition.bboxFill?.opacity === 'string') {
      definition.bboxFill.opacity = parseFloat(definition.bboxFill.opacity);
    }
    if (typeof definition.highlight?.opacity === 'string') {
      definition.highlight.opacity = parseFloat(definition.highlight.opacity);
    }
    if (typeof definition.transform?.height === 'string') {
      definition.transform.height = parseFloat(definition.transform.height);
    }
  }

  private augmentDefinition(original: StyleDefinition, augmentWith: StyleDefinition): void {

    const isDefined = <T>(value: T | undefined | null): value is T => {
      return <T>value !== undefined && <T>value !== null;
    };

    this.coerceDefinition(augmentWith);

    if (augmentWith.visible !== undefined) {
      original.visible = augmentWith.visible;
    }
    if (augmentWith.opacity !== undefined) {
      original.opacity = augmentWith.opacity;
    }
    if (augmentWith.maxOpacity !== undefined) {
      original.maxOpacity = augmentWith.maxOpacity;
    }

    if (augmentWith.color !== undefined) {
      original.color = augmentWith.color;
    }

    if (augmentWith.color == undefined) { 
      if (augmentWith.colorByValue !== undefined && augmentWith.colorByValueKey !== undefined) {
        original.color = augmentWith.color;
      }
    }

    if (augmentWith.depthTest !== undefined) {
      original.depthTest = augmentWith.depthTest;
    }
    if (augmentWith.material !== undefined) {
      original.material = augmentWith.material;
    }
    if (augmentWith.clippingPlanes !== undefined) {
      if (original.clippingPlanes === undefined) {
        original.clippingPlanes = augmentWith.clippingPlanes;
      } else {
        const originalPlanesNames = original.clippingPlanes.map(cp => (cp as any).name);
        const newClippingPlanes = augmentWith.clippingPlanes.filter(cp => !originalPlanesNames.includes((cp as any).name));
        original.clippingPlanes.push(...newClippingPlanes);
      }
    }

    if (!isDefined(original.label) && isDefined(augmentWith.label)) {
      original.label = Object.assign({}, augmentWith.label);
    } else if (isDefined(original.label) && isDefined(augmentWith.label)) {
      if (augmentWith.label.visible !== undefined) {
        original.label.visible = augmentWith.label.visible;
      }
      if (augmentWith.label.key !== undefined) {
        original.label.key = augmentWith.label.key;
      }
      if (augmentWith.label.template !== undefined) {
        original.label.template = augmentWith.label.template;
      }
      if (augmentWith.label.backgroundColor !== undefined) {
        original.label.backgroundColor = augmentWith.label.backgroundColor;
      }
      if (augmentWith.label.textColor !== undefined) {
        original.label.textColor = augmentWith.label.textColor;
      }
      if (augmentWith.label.scale !== undefined) {
        original.label.scale = augmentWith.label.scale;
      }
      if (augmentWith.label.centroidMethod !== undefined) {
        original.label.centroidMethod = augmentWith.label.centroidMethod;
      }
      if (augmentWith.label.position !== undefined) {
        original.label.position = augmentWith.label.position;
      }
      if (augmentWith.label.positionKey !== undefined) {
        original.label.positionKey = augmentWith.label.positionKey;
      }
      if (augmentWith.label.opacity !== undefined) {
        original.label.opacity = augmentWith.label.opacity;
      }
    }

    if (!isDefined(original.icon) && isDefined(augmentWith.icon)) {
      original.icon = Object.assign({}, augmentWith.icon);
    } else if (isDefined(original.icon) && isDefined(augmentWith.icon)) {
      if (augmentWith.icon.visible !== undefined) {
        original.icon.visible = augmentWith.icon.visible;
      }
      if (augmentWith.icon.default !== undefined) {
        original.icon.default = augmentWith.icon.default;
      }
      if (augmentWith.icon.key !== undefined) {
        original.icon.key = augmentWith.icon.key;
      }
      if (augmentWith.icon.backgroundColor !== undefined) {
        original.icon.backgroundColor = augmentWith.icon.backgroundColor;
      }
      if (augmentWith.icon.textColor !== undefined) {
        original.icon.textColor = augmentWith.icon.textColor;
      }
      if (augmentWith.icon.scale !== undefined) {
        original.icon.scale = augmentWith.icon.scale;
      }
      if (augmentWith.icon.centroidMethod !== undefined) {
        original.icon.centroidMethod = augmentWith.icon.centroidMethod;
      }
      if (augmentWith.icon.position !== undefined) {
        original.icon.position = augmentWith.icon.position;
      }
      if (augmentWith.icon.positionKey !== undefined) {
        original.icon.positionKey = augmentWith.icon.positionKey;
      }
      if (augmentWith.icon.opacity !== undefined) {
        original.icon.opacity = augmentWith.icon.opacity;
      }
    }

    if (original.geometry === undefined && augmentWith.geometry !== undefined) {
      original.geometry = Object.assign({}, augmentWith.geometry);
    } else if (original.geometry !== undefined && augmentWith.geometry !== undefined) {
      if (augmentWith.geometry.replace !== undefined) {
        original.geometry.replace = augmentWith.geometry.replace;
      }
      if (augmentWith.geometry.default !== undefined) {
        original.geometry.default = augmentWith.geometry.default;
      }
      if (augmentWith.geometry.key !== undefined) {
        original.geometry.key = augmentWith.geometry.key;
      }
      if (augmentWith.geometry.scale !== undefined) {
        original.geometry.scale = augmentWith.geometry.scale;
      }
      if (augmentWith.geometry.centroidMethod !== undefined) {
        original.geometry.centroidMethod = augmentWith.geometry.centroidMethod;
      }
      if (augmentWith.geometry.position !== undefined) {
        original.geometry.position = augmentWith.geometry.position;
      }
      if (augmentWith.geometry.positionKey !== undefined) {
        original.geometry.positionKey = augmentWith.geometry.positionKey;
      }
      if (augmentWith.geometry.rotation !== undefined) {
        original.geometry.rotation = augmentWith.geometry.rotation;
      }
      if (augmentWith.geometry.rotationKey !== undefined) {
        original.geometry.rotationKey = augmentWith.geometry.rotationKey;
      }
    }

    if (augmentWith.transform !== undefined) {
      original.transform = augmentWith.transform;
    }

    if (augmentWith.edgesDisplay !== undefined) {
      original.edgesDisplay = augmentWith.edgesDisplay;
    }

    if (augmentWith.bbox !== undefined) {
      if (original.bbox === undefined) {
        original.bbox = Object.assign({}, augmentWith.bbox);
      } else {
        if (augmentWith.bbox.color !== undefined) {
          original.bbox.color = augmentWith.bbox.color;
        }
        if (augmentWith.bbox.opacity !== undefined) {
          original.bbox.opacity = augmentWith.bbox.opacity;
        }
        if (augmentWith.bbox.depthTest !== undefined) {
          original.bbox.depthTest = augmentWith.bbox.depthTest;
        }
        if (augmentWith.bbox.clipLikeMaterial !== undefined) {
          original.bbox.clipLikeMaterial = augmentWith.bbox.clipLikeMaterial;
        }
      }
    }

    if (augmentWith.bboxFill !== undefined) {
      if (original.bboxFill === undefined) {
        original.bboxFill = Object.assign({}, augmentWith.bboxFill);
      } else {
        if (augmentWith.bboxFill.color !== undefined) {
          original.bboxFill.color = augmentWith.bboxFill.color;
        }
        if (augmentWith.bboxFill.opacity !== undefined) {
          original.bboxFill.opacity = augmentWith.bboxFill.opacity;
        }
        if (augmentWith.bboxFill.depthTest !== undefined) {
          original.bboxFill.depthTest = augmentWith.bboxFill.depthTest;
        }
        if (augmentWith.bboxFill.clipLikeMaterial !== undefined) {
          original.bboxFill.clipLikeMaterial = augmentWith.bboxFill.clipLikeMaterial;
        }
      }
    }

    if (augmentWith.highlight !== undefined) {
      if (original.highlight === undefined) {
        original.highlight = Object.assign({}, augmentWith.highlight);
      } else {
        if (augmentWith.highlight.color !== undefined) {
          original.highlight.color = augmentWith.highlight.color;
        }
        if (augmentWith.highlight.opacity !== undefined) {
          original.highlight.opacity = augmentWith.highlight.opacity;
        }
        if (augmentWith.highlight.depthTest !== undefined) {
          original.highlight.depthTest = augmentWith.highlight.depthTest;
        }
        if (augmentWith.highlight.clipLikeMaterial !== undefined) {
          original.highlight.clipLikeMaterial = augmentWith.highlight.clipLikeMaterial;
        }
      }
    }
  }

  private clearDefinition(original: StyleDefinition): void {
    const keys = Object.keys(original);
    for (const key of keys) {
      if (original.hasOwnProperty(key)) {
        delete original[key];
      }
    }
  }

  private checkAgainstObject(checker: StyleChecker, object: Object3D): boolean {
    if (checker.conditions.length === 0) {
      return false;
    }
    for (const condition of checker.conditions) {
      let isConditionTrue = this.checkConditionAgainstObject(condition, object);

      if (!isConditionTrue && condition.includeParentsInTestingCondition) {
        // check if a parent validates the condition
        let objectToCheck = object;
        while (objectToCheck.parent) {
          const isConditionTrueForParent = this.checkConditionAgainstObject(condition, objectToCheck);
          if (isConditionTrueForParent) {
            isConditionTrue = true;
            break;
          }
          objectToCheck = objectToCheck.parent;
        }
      }

      if (checker.conditionOperator === 'and' && !isConditionTrue) {
        return false;
      } else if (checker.conditionOperator === 'or' && isConditionTrue) {
        return true;
      }
    }
    return checker.conditionOperator === 'and';
  }  

  private checkConditionAgainstObject(condition: StyleCondition, object: Object3D): boolean {
    const key = this.fixKeyWithOriginal(object, condition.key);
    let value = resolvePath(object, this.preparePathKey(key));
    let conditionValue = condition.value;


    // #{BuildingName}
    if (condition.value.toString().toLocaleLowerCase().trim() === '#{buildingname}' && this.scene?.userData) {
      if (this.scene.userData.selectedBuildingName) {
        conditionValue = this.scene.userData.selectedBuildingName;  // selectedBuilding.userData.properties?.name
      } else {
        conditionValue = undefined; 
      }

    // #{LevelName}
    } else if (condition.value.toString().toLocaleLowerCase().trim() === '#{levelname}' && this.scene?.userData) {
      if (this.scene.userData.selectedLevelName) {
        conditionValue = this.scene.userData.selectedLevelName; // this.selectedLevel.userData.properties?.name
      } else {
        conditionValue = undefined;
      }

    } else if (typeof condition.value === 'number' && typeof value === 'string') {
      value = parseFloat(value);
    } else if (condition.value instanceof Date && typeof value === 'string') {
      // value = moment(value).toDate();
      throw new Error('Date are not yet supported, we are transitionning away from moment');
    }
    
    if (key == "current.building") {
      if (this.scene.userData.selectedBuildingName) {
        value = this.scene.userData.selectedBuildingName;
      } else {
        value = undefined;
      }
    } 
    if (key == "current.level") {
      if (this.scene.userData.selectedLevelName) {
        value = this.scene.userData.selectedLevelName;
      } else {
        value = undefined;
      }
    }

    if (conditionValue === '') conditionValue = undefined;

    if (condition.operator === '=') {
      return this.makeNumerIfPossible(value) == this.makeNumerIfPossible(conditionValue);
    } else if (condition.operator === '!=') {
      return this.makeNumerIfPossible(value) != this.makeNumerIfPossible(conditionValue);
    } else if (condition.operator === '<') {
      return this.makeNumerIfPossible(value) < this.makeNumerIfPossible(conditionValue);
    } else if (condition.operator === '>') {
      return this.makeNumerIfPossible(value) > this.makeNumerIfPossible(conditionValue);
    } else if (condition.operator === '*') {
      if (typeof conditionValue !== 'string' && conditionValue.toString) conditionValue = conditionValue.toString();
      if (value && typeof value !== 'string' && value.toString) value = value.toString();
      if (value && typeof value !== 'string' || typeof conditionValue !== 'string') {
        // could not convert values to string
        throw new Error('Could not convert values to string');
      }
      if (value === undefined) return undefined;
      return value.toLowerCase().indexOf(conditionValue.toLowerCase()) !== -1;
    }
    return true;
  }  

  private makeNumerIfPossible(input: string | any): number | any {
    if (typeof input !== 'string') {
      return input;
    }
    const num = parseFloat(input.trim());
    return `${num}` === input.trim() ? num : input;
  }

  private fixKeyWithOriginal(object: THREE.Object3D, key: string): string {
    const o: StyledObject = object;
    if (key.indexOf('geometry.') === 0 && o.__originalGeometry) {
      key = key.replace('geometry.', '__originalGeometry.');
    }
    if (key.indexOf('material.') === 0 && o.__originalMaterial) {
      key = key.replace('material.', '__originalMaterial.');
    }
    return key;
  }

  private preparePathKey(key: string): string {
    const parts = key.split('.');
    for (let i = 0; i < parts.length; i++) {
      if (i === 0) {
        continue;
      }
      parts[i] = `["${parts[i]}"]`;
    }
    return parts.join('');
  }

}
