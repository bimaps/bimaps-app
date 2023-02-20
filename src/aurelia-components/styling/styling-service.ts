import { IconRegistry } from './icon-registry';
import { GeometryRegistry } from './geometry-registry';
import { Box3, BoxHelper, LinearFilter } from 'three';
import { bboxGeometry, centroidGeometry } from '../../three-utils/geometry-centroid';

import { Scene, Camera, WebGLRenderer, Object3D, Material, DoubleSide, HemisphereLight, DirectionalLight, SpotLight, BufferGeometry, FontLoader, TextGeometry, Vector3, Texture, Mesh, Matrix4, Side, MeshBasicMaterial, MeshLambertMaterial, MeshMatcapMaterial, MeshStandardMaterial, MeshPhongMaterial, MeshToonMaterial, PointsMaterial, ShadowMaterial, SpriteMaterial, Sprite, Color } from 'three';
import { BoxGeometry, ColorRepresentation, Plane } from 'three';
import { ThreeUtils } from '../three-utils';
import { SpriteText2D, textAlign } from 'three-text2d';
import * as resolvePath from 'object-resolve-path';
import { Parser } from 'aurelia-resources';
 
export interface StyleLabelDefinition {
  visible?: boolean;
  opacity?: number;
  threeD?: boolean;
  key?: string;
  template?: string;
  backgroundColor?: string;
  textColor?: string;
  scale?: number;
  rotation?: number;
  isHorizontal?: boolean;
  centroidMethod?: 'polylabel' | 'default';
  position?: Vector3;
  /** Look in this key to find a position for the label */
  positionKey?: string;
}

export interface StyleIconDefinition {
  visible?: boolean;
  default?: string;
  key?: string;
  backgroundColor?: string;
  textColor?: string;
  scale?: number;
  centroidMethod?: string;
  position?: Vector3;
  /** Look in this key to find a position for the label */
  positionKey?: string;
  opacity?: number;
  texture?: Texture;
}

export interface StyleGeometryDefinition {
  replace?: boolean;
  default?: string;
  key?: string;
  scale?: number;
  centroidMethod?: string;
  position?: Vector3;
  positionKey?: string;
  rotation?: Vector3;
  rotationKey?: string;
}

export interface StyleDefinition {

  /** Should the object being visible on the scene */
  visible?: boolean;

  /** Change the opacity only of the original material, this definition is ignored if a material is provided */
  opacity?: number;

  /** If provided, this value will ensure that the material has a max opacity of `maxOpacity`, this definition is ignored if a material is provided */
  maxOpacity?: number;

  /** Change the color only of the original material, this definition is ignored if a material is provided */
  color?: ColorRepresentation;

  /** Change the color only of the original material, this definition is ignored if a material is provided */
  colorByValue?: Array<string>;

  /** Change color based on a key, example : userData.properties.type = IfcWall, IfcFloor, IfcDoor */
  colorByValueKey?: string;

  /** Change the side only of the original material, this definition is ignored if a material is provided */
  side?: Side;

  /** Change the depthTest only of the original material, this definition is ignored if a material is provided */
  depthTest?: boolean;

  clippingPlanes?: Plane[];

  /** Use this specific material for the object */
  material?: Material | Material[];
  
  /** Use this specific geometry for the object */
  // geometry?: BufferGeometry;
  // TODO: handle renderOrder
  
  label?: StyleLabelDefinition;
  
  icon?: StyleIconDefinition;
  
  geometry?: StyleGeometryDefinition;

  transform?: {
    type: 'set-height';
    height?: number;
  };

  bbox?: {
    color: ColorRepresentation;
    opacity?: number;
    depthTest?: boolean;
    clipLikeMaterial?: boolean;
  };

  bboxFill?: {
    color: ColorRepresentation;
    opacity?: number;
    depthTest?: boolean;
    clipLikeMaterial?: boolean;
  };

  edgesDisplay?: {
    color: ColorRepresentation;
    depthTest?: boolean;
  };

  highlight?: {
    color: ColorRepresentation;
    opacity?: number;
    depthTest?: boolean;
    clipLikeMaterial?: boolean;
  }
}

export interface StyledObject extends Object3D {
  __originalMaterial?: Material | Material[];
  __originalGeometry?: BufferGeometry;
  __originalPosition?: Vector3;
  __originalScale?: Vector3;
  __originalBoundingBox?: Box3;
}

export class StylingService {

  public overlayScene: Scene = new Scene();

  private static LOGSTYLESINOBJECTS = false;

  constructor(private linkedScene: Scene, private renderer: WebGLRenderer, private camera: Camera) {
    this.setupAnimation();
  }

  public setupAnimation = (): void => {
      // this.stats.begin();
      //this.renderer.clippingPlanes = [];
      this.renderer.autoClear = false;
      this.renderer.render(this.overlayScene, this.camera);
      this.renderer.autoClear = true;
      requestAnimationFrame(this.setupAnimation);
  }

  public applyStyle(object: StyledObject, definition: StyleDefinition): void {
    // use the `o` variable to always have a typed StyledObject even behind a check for instance of Mesh
    const o = object;

    if (StylingService.LOGSTYLESINOBJECTS) {
      (o as any).__styleDefinition = definition;
    }

    // save original
    const isMesh = object instanceof Mesh;
    if (!object.__originalMaterial && isMesh) {
      o.__originalMaterial = (object as Mesh).material;
    }
    if (!object.__originalGeometry && isMesh) {
      o.__originalGeometry = (object as Mesh).geometry;
    }
    if (!object.__originalPosition) {
      o.__originalPosition = object.position.clone();
    }
    if (!object.__originalScale) {
      o.__originalScale = object.scale.clone();
    }
    if (!object.__originalBoundingBox && isMesh) {
      if (!(object as Mesh).geometry.boundingBox) {
        (object as Mesh).geometry.computeBoundingBox();
      }
      o.__originalBoundingBox = (object as Mesh).geometry.boundingBox;
    }

    // process visibility
    object.visible = definition.visible !== undefined ? definition.visible : true;

    
    if (object instanceof Mesh) {
      // process material
      if (definition.material === undefined && definition.color === undefined && definition.opacity === undefined && definition.clippingPlanes === undefined) {
        // no definition impacting the material, use the original
        object.material = o.__originalMaterial;
      } else if (definition.material === undefined) {
        // the original material must be changed with fine tuning settings
        if (Array.isArray(o.__originalMaterial)) {
          const newMaterials = o.__originalMaterial.map(m => this.prepareMaterial(m, definition.color, definition.opacity, definition.side, definition.clippingPlanes, definition.depthTest, definition.maxOpacity));
          object.material = newMaterials;
        } else {
          const newMaterial = this.prepareMaterial(o.__originalMaterial, definition.color, definition.opacity, definition.side, definition.clippingPlanes, definition.depthTest, definition.maxOpacity);
          // console.log('newMaterial', newMaterial);
          // console.log('object', object);
          object.material = newMaterial;
        }
      } else {
        console.warn('Replacing a complete material is going to be deprecated, please use fine tuned material property instead in your style definition', definition);
        // the material must be completely replaced
        // TODO: ensure the type of material is replaceable (line material doesnt work with mesh material for exemple)
        if (object.material instanceof MeshBasicMaterial || object.material instanceof MeshLambertMaterial) {
          object.material = definition.material;
        } else {
          console.log('original material', object.material);
        }
      }

      // process geometry
      if (definition.geometry?.replace) {
        this.replaceObjectGeometry(object, definition);
      } else {
        object.geometry = o.__originalGeometry;
      }
      if (definition.edgesDisplay) {
        // this.three.objects.addEdgestoObject(object);
      } else {
        // this.three.objects.removeEdgesObject(object);
      }

      if (definition.transform) {
        if (definition.transform.type === 'set-height' && object.geometry instanceof BufferGeometry) {

          // 1. take the minimim height value of each vertices
          // 2. if a vertice is minimium value => leave it as is
          // 3. if a vertice is higher => set minium + transform.height

          const clonedGeometry = o.__originalGeometry.clone();
          const positionAttribute = clonedGeometry.getAttribute('position');
          
          if (clonedGeometry.index) {
            const indexAttribute = clonedGeometry.getIndex();
            const allY: number[] = [];
            for (let k = 0; k < indexAttribute.array.length; k++) {
              const index = indexAttribute.getX(k);
              allY.push(Math.round(positionAttribute.getY(index) * 1000) / 1000);
            }
            const minY = Math.min(...allY);

            for (let k = 0; k < indexAttribute.array.length; k++) {
              const index = indexAttribute.getX(k);
              const yValue = Math.round(positionAttribute.getY(index) * 1000) / 1000;
              if (yValue !== minY) {
                positionAttribute.setY(index, minY + Math.round(minY + definition.transform.height * 1000) / 1000);
              }
            }
          } else {
            const allY: number[] = [];
            for (let index = 0; index < positionAttribute.array.length / positionAttribute.itemSize; index++) {
              allY.push(Math.round(positionAttribute.getY(index) * 1000) / 1000);
            }
            const minY = Math.min(...allY);

            for (let index = 0; index < positionAttribute.array.length / positionAttribute.itemSize; index++) {
              const yValue = Math.round(positionAttribute.getY(index) * 1000) / 1000;
              if (yValue !== minY) {
                positionAttribute.setY(index, minY + Math.round(minY + definition.transform.height * 1000) / 1000);
              }
            }
          }
          positionAttribute.needsUpdate = true;
          object.geometry = clonedGeometry;
        }
      }

      if (definition.highlight) {
        let box = this.overlayScene.getObjectByName(`highlight-${object.uuid}`) as Mesh;
        if (!box) {
          box = object.clone();
          if (object.parent) {
            box.applyMatrix4(object.parent.matrixWorld);
          }
          box.material = new MeshBasicMaterial( { color: definition.highlight.color, opacity: definition.highlight.opacity !== undefined ? definition.highlight.opacity : 1, transparent: true } );
          (box.material as Material).depthTest = definition.highlight.depthTest;
          (box.material as Material).clipShadows = true;
          box.name = `highlight-${object.uuid}`;
          box.userData._type = '_highlight';
          box.renderOrder = 10;
          this.overlayScene.add(box as unknown as Object3D);
        }
        if (definition.highlight.clipLikeMaterial && definition.clippingPlanes?.length) {
          (box.material as Material).clippingPlanes = definition.clippingPlanes;
        } else {
          (box.material as Material).clippingPlanes = null;
        }
        this.overlayScene.add(box as unknown as Object3D);
      } else {
        const box = this.overlayScene.getObjectByName(`highlight-${object.uuid}`);
        if (box) {
          this.overlayScene.remove(box);
        }
      }
    }

    if (definition.bbox) {
      let box = this.overlayScene.getObjectByName(`bbox-${object.uuid}`) as BoxHelper;
      if (!box) {
        box = new BoxHelper(object, definition.bbox.color);
        (box.material as Material).depthTest = definition.bbox.depthTest;
        (box.material as Material).clipShadows = true;
        (box.material as Material).opacity = definition.bbox.opacity !== undefined ? definition.bbox.opacity : 1;
        (box.material as Material).transparent = true;
        box.name = `bbox-${object.uuid}`;
        box.userData._type = '_bbox';
        box.renderOrder = 10;
      }
      if (definition.bbox.clipLikeMaterial && definition.clippingPlanes?.length) {
        (box.material as Material).clippingPlanes = definition.clippingPlanes;
      } else {
        (box.material as Material).clippingPlanes = null;
      }
      this.overlayScene.add(box as unknown as Object3D);
    } else {
      const box = this.overlayScene.getObjectByName(`bbox-${object.uuid}`);
      if (box) {
        this.overlayScene.remove(box);
      }
    }

    if (definition.bboxFill) {
      let box = this.overlayScene.getObjectByName(`bboxFill-${object.uuid}`) as Mesh;
      if (!box) {
        const bbox = ThreeUtils.bboxFromObject(object);
        const centroid = ThreeUtils.centroidFromObject(object);
        const w = bbox.max.x - bbox.min.x;
        const h = bbox.max.y - bbox.min.y;
        const d = bbox.max.z - bbox.min.z;
        const geometry = new BoxGeometry(w, h, d);
        const translationMatrix = new Matrix4().setPosition(centroid);
        geometry.applyMatrix4(translationMatrix);
        const material = new MeshBasicMaterial({color: definition.bboxFill.color, opacity: definition.bboxFill.opacity, depthTest: definition.bboxFill.depthTest});
        box = new Mesh(geometry, material);
        // (box.material as Material).depthTest = definition.bboxFill.depthTest;
        (box.material as Material).clipShadows = true;
        // (box.material as Material).opacity = definition.bboxFill.opacity !== undefined ? definition.bboxFill.opacity : 1;
        (box.material as Material).transparent = true;
        box.name = `bboxFill-${object.uuid}`;
        box.userData._type = '_bboxFill';
        box.renderOrder = 10;
      }
      if (definition.bboxFill.clipLikeMaterial && definition.clippingPlanes?.length) {
        (box.material as Material).clippingPlanes = definition.clippingPlanes;
      } else {
        (box.material as Material).clippingPlanes = null;
      }
      this.overlayScene.add(box as unknown as Object3D);
    } else {
      const box = this.overlayScene.getObjectByName(`bboxFill-${object.uuid}`);
      if (box) {
        this.overlayScene.remove(box);
      }
    }

    if (definition.label?.visible) {
      this.addObjectLabel(object, definition);
    } else {
      this.removeObjectLabel(object);
    }

    if (definition.icon?.visible) {
      this.addObjectIcon(object, definition);
    } else {
      this.removeObjectIcon(object);
    }
  }

  private isMaterialWithColor(material: Material): boolean {
    return material instanceof MeshBasicMaterial || material instanceof MeshLambertMaterial || material instanceof MeshMatcapMaterial || material instanceof MeshPhongMaterial || material instanceof MeshStandardMaterial || material instanceof MeshToonMaterial || material instanceof PointsMaterial || material instanceof ShadowMaterial || material instanceof SpriteMaterial;
  }

  private materials: {[key: string]: Material} = {};
  private prepareMaterial(original: Material, color: ColorRepresentation | undefined, opacity: number | undefined, side: Side | undefined, clippingPlanes: Plane[] | undefined, depthTest: boolean | undefined, maxOpacity: number | undefined) {
    color = this.isMaterialWithColor(original) ? color : undefined;
    if (color === undefined && opacity === undefined && side === undefined && clippingPlanes === undefined && depthTest === undefined) {
      return original;
    }
    const originalColor = color ? (original as (Material & {color: ColorRepresentation})).color : undefined;
    // process maxOpacity
    if (maxOpacity) {
      if (opacity !== undefined) {
        opacity = Math.min(maxOpacity, opacity);
      } else {
        opacity = Math.min(maxOpacity, original.opacity)
      }
    }
    if ((originalColor || '').toString() === (color || '').toString() && original.opacity === opacity && depthTest === original.depthTest) {
      return original;
    }
    const clippingPlanesId = (clippingPlanes || []).map(cp => `${(cp as any).name}`).join(',');

    const newUiid = original.uuid + `:C${color !== undefined ? color : '-'}:O${opacity !== undefined ? opacity : '-'}:S${side !== undefined ? side : '-'}:CP${clippingPlanesId}:DT${depthTest !== undefined ? depthTest : '-'}`;
    if (this.materials[newUiid]) {
      return this.materials[newUiid];
    }
    const cloned = original.clone();
    cloned.uuid = newUiid;
    if (color && this.isMaterialWithColor(cloned)) {
      (cloned as (Material & {color: ColorRepresentation})).color = new Color(color);
    }
    cloned.opacity = typeof opacity === 'number' ? opacity : 1;
    if (cloned.opacity < 1) {
      cloned.transparent = true;
    }
    cloned.side = side;
    cloned.depthTest = typeof depthTest === 'boolean' ? depthTest : cloned.depthTest;
    if (clippingPlanes !== undefined) {
      cloned.clippingPlanes = clippingPlanes || [];
      cloned.clipShadows = true;
    }
    this.materials[newUiid] = cloned;
    cloned.side = DoubleSide; // TODO : Add option to Styling-manager
    return cloned;
  }

  private addObjectLabel(object: StyledObject, definition: StyleDefinition) {
    this.removeObjectLabel(object);
    // label name
    const name = `label-${object.uuid}`;
    // label position
    let position: {x: number, y: number, z: number};
    const keyPosition = definition.label.positionKey ? resolvePath(object, definition.label.positionKey) : undefined;
    if (keyPosition) {
      let labelPosition = keyPosition.split(',');
      position = {
        x: parseFloat(labelPosition[0]),
        y: parseFloat(labelPosition[1]),
        z: parseFloat(labelPosition[2])
      };
    } else {
      // otherwise we position the label using the centroid of the object
      const bbox = ThreeUtils.bboxFromObject(object);
      if (definition.label.centroidMethod === 'polylabel' && object instanceof Mesh) {
        // position = ThreeUtils.polylabel(object, bbox.min.y);
        throw new Error('Polylabel centroid method is not yet implemented');
      } else {
        position = ThreeUtils.centroidFromBbox(bbox);
      }
    }
    // apply position offset (from style)
    let offsetX = 0;
    let offsetY = 0;
    let offsetZ = 0;
    if (definition.label?.position?.x) {
      offsetX = definition.label.position.x;
    }
    if (definition.label?.position?.y) {
      offsetY = definition.label.position.y;
    }
    if (definition.label?.position?.z) {
      offsetZ = definition.label.position.z;
    }
    
    position.x += offsetX;
    position.y += offsetY;
    position.z += offsetZ;

    let options = {
      textAlign: textAlign.center,
      font: '40px Arial',
      textColor: definition.label.textColor,
      backgroundColor: definition.label.backgroundColor,
      paddingX: 10,
      opacity: typeof definition.label.opacity === 'number' ? definition.label.opacity : 1,
      rotation: definition.label.rotation,
      isHorizontal: definition.label.isHorizontal
    };

    let text = '';
    if (definition.label.template) {
      text = Parser.parseTemplate(definition.label.template, {object});
    } else {
      text = resolvePath(object, definition.label.key || 'userData.label');
    }

    text = text.trim();

    if (!text) {
      return;
    }

    let label3D: boolean = false;
    label3D = definition.label?.threeD ? definition.label?.threeD : false;

    this.addLabel(label3D, name, text, position, definition.label.scale, options);

  }

  private removeObjectLabel(object: THREE.Object3D) {
    let name = `label-${object.uuid}`;
    let labelObject = this.overlayScene.getObjectByName(name);
    if (labelObject) this.overlayScene.remove(labelObject);
  }

  public async removeAllOverlays() {
    let removeObjs: THREE.Object3D[] = [];
    for (const obj of this.overlayScene.children) {
      if (obj.name.includes('highlight-') || obj.name.includes('bbox-') || obj.name.includes('bboxFill-') || obj.name.includes('label-') || obj.name.includes('icon-')) {
        removeObjs.push(obj);
      }
    }
    for (const obj of removeObjs) {
      this.overlayScene.remove(obj);
    }
  }

  
  public async loadText3DAsync(text : string, url: string, size: number, height: number,position: Vector3, rotation: number, isHorizontal: boolean, material: MeshPhongMaterial): Promise<Mesh> {
    return new Promise<Mesh>((resolve) => {
      this.load3DText(text, url,size, height, position, rotation, isHorizontal, material, resolve);
    });
  }

  private async load3DText(text: string, fontUrl: string, size: number, height: number, position: Vector3, rotation: number, isHorizontal: boolean, material: MeshPhongMaterial, onLoad: (result: Mesh) => void): Promise<void>{
      const loader = new FontLoader();
      loader.load( fontUrl, async ( font )  => {
          const textGeo = new TextGeometry( text, {
              font: font,
              size: size,
              height: height,
              curveSegments: 24,
              bevelThickness: size / 100,
              bevelSize: size / 100,
              bevelEnabled: true
            }
          );
          textGeo.computeBoundingBox();
          const mesh = new Mesh(textGeo, material);
          mesh.position.x = position.x;
          mesh.position.y = position.y;
          mesh.position.z = position.z;
          if (isHorizontal) mesh.rotateX(-Math.PI / 2); // isHorizontal or Vertical
          mesh.rotateOnWorldAxis(new Vector3(0,1,0), ((rotation / 180 ) * Math.PI)) // Rotation (degre) x/180 | y/PI
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          onLoad(mesh);
        })

  }

  private async addLabel(label3D: boolean, name: string, text: string, position = { x: 0, y: 0, z: 0 }, scale = 1, options: any = {}) {
    if (options.textAlign === undefined) options.textAlign = textAlign.center;
    if (options.font === undefined) options.font = '20px Arial';
    if (options.textColor === undefined) options.textColor = '#000000';
    if (options.backgroundColor === undefined) options.backgroundColor = '#fffff';
    if (options.paddingX === undefined) options.paddingX = 10;
    if (options.opacity === undefined) options.opacity = 1;

    if (typeof scale !== 'number' || Number.isNaN(scale)) scale = 1;

    if (!label3D) {
      let sprite = new SpriteText2D(text, {
        align: options.textAlign,
        font: options.font,
        fillStyle: options.textColor,
        backgroundColor: options.backgroundColor,
        verticalPadding: 2,
        horizontalPadding: 2,
        antialias: true
      });
      
      sprite.position.set(position.x, position.y, position.z);
      sprite.scale.set(scale * 0.0004, scale * 0.0004, scale * 0.0004);
  
      sprite.name = name;
      sprite.userData._type = '_label';
      sprite.material.depthTest = false;
      if (sprite.material instanceof SpriteMaterial) {
        sprite.material.sizeAttenuation = false;
      }
      sprite.material.opacity = options.opacity;
      sprite.material.transparent = true;
      sprite.renderOrder = 10;
  
      this.overlayScene.add(sprite as unknown as Object3D);
  
      return sprite;
    } else {

      const rotation: number = options.rotation? options.rotation : 0;
      const isHorizontal: boolean = options.isHorizontal? options.isHorizontal : false;
      const material = new MeshPhongMaterial( { color: options.textColor, specular: 0xffffff } );
      const meshText: Mesh = await this.loadText3DAsync(text,'helvetiker_bold.typeface.json', scale, scale / 10, new Vector3(position.x,position.y,position.z), rotation, isHorizontal, material);
      meshText.name = name;
      meshText.userData._type = '_label';
      // meshText.material.transparent = true;
      meshText.renderOrder = 10;
      this.overlayScene.add(meshText as unknown as Mesh);

        
      // Add Light
      this.setupLights();
    }
   
  }

  private setupLights(): void {

    const directionalLightName: string = "DirectionalLight-Label";
    let directionalLightObject = this.overlayScene.getObjectByName(directionalLightName);

    if (!directionalLightObject) {
      const directionalLight2 = new DirectionalLight(0xffffff, 0.3);
      directionalLight2.position.set(500, 300, 500);
      directionalLight2.name = directionalLightName;
      this.overlayScene.add(directionalLight2);
  
      const hemiLight = new HemisphereLight(0xffffff, 0x080820, 0.75);
      this.overlayScene.add(hemiLight);
  
      const light = new SpotLight(0xffeeb1,0.4);
      light.position.set(-500,100,-500);
      light.castShadow = true;
      this.overlayScene.add( light );
  
      this.renderer.shadowMap.enabled = true;
  
      light.shadow.bias = -0.0001;
      light.shadow.mapSize.width = 1024*4;
      light.shadow.mapSize.height = 1024*4;
    }
  }

  private addObjectIcon(object: StyledObject, definition: StyleDefinition) {
    this.removeObjectIcon(object);
    // icon name
    const name = `icon-${object.uuid}`;
    // label position
    let position: {x: number, y: number, z: number};
    const keyPosition = definition.icon.positionKey ? resolvePath(object, definition.icon.positionKey) : undefined;
    if (keyPosition) {
      let iconPosition = keyPosition.split(',');
      position = {
        x: parseFloat(iconPosition[0]),
        y: parseFloat(iconPosition[1]),
        z: parseFloat(iconPosition[2])
      };
    } else {
      // otherwise we position the label using the centroid of the object
      const bbox = ThreeUtils.bboxFromObject(object);
      if (definition.icon.centroidMethod === 'polylabel' && object instanceof Mesh) {
        // position = ThreeUtils.polylabel(object, bbox.min.y);
        throw new Error('Polylabel centroid method is not yet implemented');
      } else {
        position = ThreeUtils.centroidFromBbox(bbox);
      }
    }
    // apply position offset (from style)
    let offsetX = 0;
    let offsetY = 0;
    let offsetZ = 0;
    if (definition.icon?.position?.x) {
      offsetX = definition.icon.position.x;
    }
    if (definition.icon?.position?.y) {
      offsetY = definition.icon.position.y;
    }
    if (definition.icon?.position?.z) {
      offsetZ = definition.icon.position.z;
    }
    
    position.x += offsetX;
    position.y += offsetY;
    position.z += offsetZ;

    const options = {
      opacity: definition.icon.opacity,
      backgroundColor: definition.icon.backgroundColor,
      strokeColor: definition.icon.textColor
    }

    const keyIcon = definition.icon.key ? resolvePath(object, definition.icon.key) : undefined;
    const iconName = keyIcon || definition.icon.default;
    this.addIcon(name, iconName, position, definition.icon.scale, options);
  }

  private removeObjectIcon(object: THREE.Object3D) {
    let name = `icon-${object.uuid}`;
    let iconObject = this.overlayScene.getObjectByName(name);
    if (iconObject) this.overlayScene.remove(iconObject);
  }

  private addIcon(name: string, iconName: string, position = { x: 0, y: 0, z: 0 }, scale = 20, options?: {backgroundColor?: string, strokeColor?: string, text?: string, opacity?: number}) {
    if (!options?.backgroundColor) {
      options.backgroundColor = 'default';
    }
    if (!options?.strokeColor) {
      options.strokeColor = 'default';
    }
    if (!options?.opacity) {
      options.opacity = 1;
    }

    // TODO: It would be good to find a way to avoid this async code here
    IconRegistry.getIconTexture(iconName, options.backgroundColor, options.strokeColor, options.text).then((texture) => {
      const material = new SpriteMaterial({ map: texture });
      const sprite = new Sprite(material);
      sprite.position.set(position.x, position.y, position.z);
      sprite.scale.set(scale * 0.005, scale * 0.005, scale * 0.005);
      sprite.name = name;
      sprite.userData._type = '_icon';
      sprite.material.depthTest = false;
      sprite.material.map.minFilter = LinearFilter;
      if (sprite.material instanceof SpriteMaterial) {
        sprite.material.sizeAttenuation = false;
      }
      sprite.material.opacity = options.opacity;
      sprite.material.transparent = true;
      sprite.renderOrder = 10;

      this.overlayScene.add(sprite as unknown as Object3D);
    }).catch(() => {
      console.warn('Impossible to draw icon, missing texture', iconName);
    });
  }

  private replaceObjectGeometry(object: Mesh, definition: StyleDefinition) {
    // measure original object position
    const o: StyledObject = object;
    // TODO: ensure this is in a world coordinate, or take this question
    // into account for positionning replace geometry

    const originalGeometryCentroid = centroidGeometry(o.__originalGeometry);

    // determine translation and rotation to apply to the replaced geometry
    const geometryPosition = definition.geometry?.positionKey ? resolvePath(object, definition.geometry.positionKey) : undefined;
    let tx: number;
    let ty: number;
    let tz: number;
    if (geometryPosition) {
      // if the object has a position defined in property
      const position = geometryPosition.split(',');
      tx = parseFloat(position[0]);
      ty = parseFloat(position[1]);
      tz = parseFloat(position[2]);
    } else {
      tx = originalGeometryCentroid.x + (definition.geometry?.position ? definition.geometry.position.x : 0);
      ty = originalGeometryCentroid.y + (definition.geometry?.position ? definition.geometry.position.y : 0);
      tz = originalGeometryCentroid.z + (definition.geometry?.position ? definition.geometry.position.z : 0);
    }

    let rx: number;
    let ry: number;
    let rz: number;
    const geometryRotation = definition.geometry?.rotationKey ? resolvePath(object, definition.geometry.rotationKey) : undefined;
    if (geometryRotation) {
      // if the object has a rotation defined in property
      const rotation = geometryRotation.split(',');
      rx = parseFloat(rotation[0]);
      ry = parseFloat(rotation[1]);
      rz = parseFloat(rotation[2]);
    } else {
      rx = definition.geometry?.rotation ? definition.geometry.rotation.x :  0;
      ry = definition.geometry?.rotation ? definition.geometry.rotation.y :  0;
      rz = definition.geometry?.rotation ? definition.geometry.rotation.z :  0;
    }

    let matrix = new Matrix4();
    let translation = new Matrix4().makeTranslation(tx, ty, tz);
    let rotationX = new Matrix4().makeRotationX(rx);
    let rotationY = new Matrix4().makeRotationY(ry);
    let rotationZ = new Matrix4().makeRotationZ(rz);
    let scale = new Matrix4().makeScale(definition.geometry?.scale || 1, definition.geometry?.scale || 1, definition.geometry?.scale || 1);
    matrix.multiply(translation).multiply(rotationX).multiply(rotationY).multiply(rotationZ).multiply(scale);

    const geometryFromKey = definition.geometry.key ? resolvePath(object, definition.geometry.key) : undefined;
    const geometryName = geometryFromKey || definition.geometry.default;
    let geometry = GeometryRegistry.getGeometry(geometryName);
    if (!geometry) {
      console.warn('Replace geometry not found', geometryName);
    }
    const replacedGeometry = geometry.clone();

    // Below, instead of simply replacing the geometry, we do a little trick to ensure
    // coherance between geometry and material data:
    // 1. We create a temporary mesh with the replacedGeometry and using the object material (first one if several are attached)
    // 2. This will let THREE create the right links between geometry groups and material
    // 3. Then we use the material computed for the the Mesh and apply it to the object, along with the replaced geometry
    const mat = Array.isArray(object.material) ? object.material[0] : object.material;
    const mesh = new Mesh(replacedGeometry, mat);
    replacedGeometry.applyMatrix4(matrix);
    object.geometry = mesh.geometry;
    object.material = mesh.material;
  }

}
