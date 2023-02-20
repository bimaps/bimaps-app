import { Vector3 } from 'three';

export const navigationCoordinates = [
  [-56.77116988141385, 24.142499465495348, -5.66094515162907],
  [-56.596915961320775, 24.142499465495348, -7.901702628001474],
  [-45.3776681335293, 24.142499465495348, -7.856509201187821],
  [-45.23561918657848, 24.142499465495355, -2.8802532327434553]
];

interface Segment {
  firstPoint: PointType;
  lastPoint: PointType;
  customPointTypes?: {[key: number]: PointType};
  coordinates: Vector3[];
}

interface PointType {
  type: 'lift' | 'door' | 'building-door' | 'stairs';
  storey: string;
}
