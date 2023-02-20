import { Scene, Vector3, Mesh, MeshLambertMaterial, ColorRepresentation, SphereBufferGeometry, Line, BufferGeometry, LineBasicMaterial } from 'three';
export class Log {
  
  private points: Mesh[] = [];
  private lines: Line[] = [];

  constructor(private scene: Scene) {}

  public clearAll(): void {
    this.clearPoints();
    this.clearLines();
  }

  public clearPoints(): void {
    for (const point of this.points) {
      point.removeFromParent();
    }
    this.points = [];
  }

  public point(position: Vector3, color: ColorRepresentation = 'red', size = 0.5, opacity = 1, depthTest = false): void {
    const geometry = new SphereBufferGeometry(size);
    const material = new MeshLambertMaterial({color, depthTest, opacity});
    const mesh = new Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData.type = 'point-log';
    this.scene.add(mesh);
    this.points.push(mesh);
  }

  public clearLines(): void {
    for (const line of this.lines) {
      line.removeFromParent();
    }
    this.lines = [];
  }

  public line(coordinates: Vector3[], color: ColorRepresentation, opacity = 1, depthTest = false): void {
    const geometry = new BufferGeometry().setFromPoints(coordinates);
    const material = new LineBasicMaterial({color, depthTest, opacity});
    const line = new Line(geometry, material);
    line.userData.type = 'line-log';
    this.scene.add(line);
    this.lines.push(line);
  }
}
