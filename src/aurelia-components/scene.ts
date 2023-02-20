import * as THREE from 'three';
import { AmbientLight, Color, DirectionalLight } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// import Stats from 'stats.js/src/Stats';

export class Scene {

  public canvas: HTMLCanvasElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  // public stats: Stats;

  constructor(canvas: HTMLCanvasElement) {
      this.canvas = canvas;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, this.canvas.offsetWidth / this.canvas.offsetHeight, 0.1, 3000);
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: this.canvas});
      this.renderer.localClippingEnabled = true;
      // this.renderer.setClearColor(0x000000, 0);
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      // this.stats = new Stats();
      this.setupScene();
  }

    public setupScene(): void {
        this.setupBasics();
        this.setupLights();
        this.setupWindowResize();
        this.setupMonitoring();
        this.setupAnimation();
        this.setupCamera();
    }

    public setupAnimation = (): void => {
        // this.stats.begin();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        // this.stats.end();
        requestAnimationFrame(this.setupAnimation);
    }

    public setupBasics(): void {
        // this.scene.background = new Color(0x8cc7de);
        this.renderer.setSize(this.canvas.offsetWidth, this.canvas.offsetHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.camera.position.z = 5;
    }

    public setupLights(): void {
        // const directionalLight1 = new DirectionalLight(0xffeeff, 0.4);
        // directionalLight1.position.set(300, 30, 300);
        // this.scene.add(directionalLight1);
        const directionalLight2 = new DirectionalLight(0xffffff, 0.3);
        directionalLight2.position.set(500, 300, 500);
        this.scene.add(directionalLight2);
        // const ambientLight = new AmbientLight(0xffffee, 0.6);
        // this.scene.add(ambientLight);

        // const hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 4);
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x080820, 0.75);
        this.scene.add(hemiLight);

        // const light = new THREE.SpotLight(0xffeeb1,4);
        const light = new THREE.SpotLight(0xffeeb1,0.4);
        light.position.set(-500,100,-500);
        light.castShadow = true;
        this.scene.add( light );

        // Add shadow to mesh
        // model.traverse(n => { if ( n.isMesh ) {
        //     n.castShadow = true; 
        //     n.receiveShadow = true;
        //     if(n.material.map) n.material.map.anisotropy = 16; 
        //   }});

        this.renderer.shadowMap.enabled = true;

        light.shadow.bias = -0.0001;
        light.shadow.mapSize.width = 1024*4;
        light.shadow.mapSize.height = 1024*4;

    }

    public setupWindowResize(): void {
        window.addEventListener('resize', () => {
          const height = this.canvas.parentElement.offsetHeight;
          const width = this.canvas.parentElement.offsetWidth;
          this.camera.aspect = width / height;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(width, height);
        });
    }

    public setupMonitoring(): void {
        // this.stats.showPanel(0);
        // this.stats.dom.style.cssText = 'position:absolute;top:1rem;left:1rem;z-index:1;';
        // document.body.appendChild(this.stats.dom);
    }

    public setupCamera(): void {
        this.camera.position.set(10, 10, 10);
        this.controls.target.set(0, 0, 0);
    }
}
