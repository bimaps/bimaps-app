import { ThreeUtils } from './../three-utils';
import { BaseTool } from './base-tool';
import { EventAggregator } from 'aurelia-event-aggregator';
import { inject } from 'aurelia-framework';
import { Three } from '../three';
import { Vector3 } from 'three';

@inject(EventAggregator, Three)
export class ClippingTool extends BaseTool {

  constructor(eventAggregator: EventAggregator, private three: Three) {
    super(eventAggregator);
    // this.hoverBoxPosition = 'next-toolbar';
  }

  public attached(): void {
    super.attached();
  }

  public detached(): void {
    super.detached();
  }

  public clip(plane: 'X' | 'Y' | 'Z'): void {
    this.three.clippingControls.planeSize = 5;

    const sceneCentroid = ThreeUtils.centroidFromObject(this.three.scene.scene);

    if (plane === 'X') {
      this.three.clippingControls.addClippingPlane(new Vector3(0, -1, 0), sceneCentroid);
    } else if (plane === 'Y') {
      this.three.clippingControls.addClippingPlane(new Vector3(-1, 0, 0), sceneCentroid);
    } else if (plane === 'Z') {
      this.three.clippingControls.addClippingPlane(new Vector3(0, 0, -1), sceneCentroid);
    }
  }

  public clear(): void {
    this.three.clippingControls.clearClippingPlanes();
  }

  public stopControlling(): void {
    this.three.clippingControls.stopControlling();
  }

  public invert(): void {
    this.three.clippingControls.invert();
  }

  public translate(): void {
    this.three.clippingControls.setMode('translate');
  }

  public rotate(): void {
    this.three.clippingControls.setMode('rotate');
  }
  
}
