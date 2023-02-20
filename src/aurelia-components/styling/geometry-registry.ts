import { BufferGeometry } from 'three';

interface RegisteredGeometry {
  name: string;
  geometry: BufferGeometry;
}

export class GeometryRegistry {

  private static registeredGeometrys: RegisteredGeometry[] = [];

  public static registerGeometry(name: string, geometry: BufferGeometry): void {
    const currentIndex = GeometryRegistry.registeredGeometrys.findIndex(i => i.name === name);
    if (currentIndex !== -1) {
      GeometryRegistry.registeredGeometrys[currentIndex].geometry = geometry;
    } else {
      GeometryRegistry.registeredGeometrys.push({name, geometry});
    }
  }

  public disposeGeometry(name: string): void {
    const currentIndex = GeometryRegistry.registeredGeometrys.findIndex(i => i.name === name);
    if (currentIndex !== -1) {
      GeometryRegistry.registeredGeometrys.splice(currentIndex, 1);
    }
  }

  public static getGeometry(name: string): BufferGeometry {
    const currentIndex = GeometryRegistry.registeredGeometrys.findIndex(i => i.name === name);
    if (currentIndex === -1) {
      console.warn('GeometryRegistry: missing geometry:', name);
      return null;
    }
    const geometry = GeometryRegistry.registeredGeometrys[currentIndex];
    return geometry.geometry;
  }
}
