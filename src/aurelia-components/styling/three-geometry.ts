import { BufferGeometry, Matrix4, ConeGeometry, BoxGeometry, SphereGeometry, CylinderGeometry } from 'three';

export class ThreeGeometry {

  private static geometries: {[key: string]: BufferGeometry} = {};
  private static callbacks: {[key: string]: () => BufferGeometry} = {};
  private static inited: boolean = false;

  private static init() {
    if (ThreeGeometry.inited) {
      return;
    }
    ThreeGeometry.register('cone', () => {
      return new ConeGeometry(20, 80, 32);
    });
    ThreeGeometry.register('cube', () => {
      let translation = new Matrix4().makeTranslation(10, 10, 10);
      return new BoxGeometry( 20, 20, 20 ).applyMatrix4(translation);
    });
    ThreeGeometry.register('sphere', () => {
      return  new SphereGeometry( 20, 32, 32 );
    });
    ThreeGeometry.register('cylinder', () => {
      return  new CylinderGeometry( 20, 20, 20, 32 );
    });
    ThreeGeometry.inited = true;
  }

  public static register(name: string, geometryOrcallback: BufferGeometry | (() => BufferGeometry)) {
    if (geometryOrcallback instanceof BufferGeometry) {
      ThreeGeometry.geometries[name] = geometryOrcallback;
    } else {
      ThreeGeometry.callbacks[name] = geometryOrcallback;
    }
  }

  public static get(name: string, context: any = null, ...params: any[]): THREE.BufferGeometry | undefined {
    ThreeGeometry.init();
    if (ThreeGeometry.geometries[name]) {
      return ThreeGeometry.geometries[name];
    } else if (ThreeGeometry.callbacks[name]) {
      return ThreeGeometry.callbacks[name].call(context, ...params);
    } else {
      return undefined;
    }
  }

}
