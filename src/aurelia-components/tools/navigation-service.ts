import { paths, Segment, Coordinate, PointType } from './path-test';
import { Scene, Vector3, Line3 } from 'three';
import { Log } from '../../three-utils/log';
import * as md5 from 'md5';

export class NavigationService {
  
  private segments: Segment[] = [];
  private signatures: string[] = [];
  private threeLogger: Log;
  private calculator: NavigationServiceCalculator;

  constructor(private scene: Scene) {
    this.threeLogger = new Log(this.scene);
    this.loadSegments();
  }

  public addSegment(segment: Segment): void {
    const signature = this.getSegmentSignature(segment);
    if (this.signatures.includes(signature)) {
      return;
    }
    this.getSegmentLength(segment);
    this.segments.push(segment);
    this.signatures.push(signature);
  }

  public loadSegments(): void {
    for (const path of paths) {
      const segment = this.pathToSegment(path);
      this.addSegment(segment);
      // this.threeLogger.line(segment.coordinates, 'red');
    }
    this.calculator = new NavigationServiceCalculator(this.segments, this.threeLogger);
  }

  private pathToSegment(path: Segment<Coordinate | Vector3>): Segment<Vector3> {
    const newCoordinates: Vector3[] = [];
    for (const coordinate of path.coordinates) {
      if (coordinate instanceof Vector3) {
        newCoordinates.push(coordinate);
      } else {
        newCoordinates.push(new Vector3(coordinate[0], coordinate[1], coordinate[2]));
      }
    }
    path.coordinates = newCoordinates;
    return path as Segment<Vector3>;
  }

  private getSegmentSignature(segment: Segment): string {
    if (segment.signature) {
      return segment.signature;
    }
    const string = segment.coordinates.map(c => c.toArray().join(',')) + `/fp:${segment.firstPoint}/lp:${segment.lastPoint}`;
    segment.signature = md5(string);
    return segment.signature;
  }

  private getSegmentLength(segment: Segment): number {
    let length = 0;
    for (let index = 0; index < segment.coordinates.length - 1; index++) {
      length += segment.coordinates[0].distanceTo(segment.coordinates[index + 1]);
    }
    segment.length = length;
    return length;
  }

  /**
   * Based on `from` and `to` points, find the shortest path (Segment) to navigate
   * from the start to the end.
   * 
   * This method will try to go in any direction and stop the path at the closest distance
   * from the points
   * @param from 
   * @param to 
   * @returns 
   */
  public getPath(from: Vector3, to: Vector3): Segment {

    this.threeLogger.clearAll();

    const {nearestSegment: startingSegment, nearestPoint: startingPoint, coordinateIndex: startingCoordinateIndex, segmentA: segAStart, segmentB: segBStart} = this.getClosestSegment(from);
    const {nearestSegment: endingSegment, nearestPoint: endingPoint, coordinateIndex: endingCoordinateIndex, segmentA: segAEnd, segmentB: segBEnd} = this.getClosestSegment(to);

    // this.addSegment(segAStart);
    // this.addSegment(segAEnd);
    // this.addSegment(segBStart);
    // this.addSegment(segBEnd);

    this.getSegmentSignature(segAStart);
    this.getSegmentSignature(segAEnd);
    this.getSegmentSignature(segBStart);
    this.getSegmentSignature(segBEnd);
    this.getSegmentLength(segAStart);
    this.getSegmentLength(segAEnd);
    this.getSegmentLength(segBStart);
    this.getSegmentLength(segBEnd);

    // const segment1: Segment = {
    //   firstPoint: startingSegment.firstPoint,
    //   lastPoint: startingSegment.lastPoint,
    //   coordinates: startingSegment.coordinates,
    //   signature: startingSegment.signature,
    //   length: startingSegment.length,
    // };
    // const reverted = [].concat(...startingSegment.coordinates);
    // reverted.reverse();
    // const segment2: Segment = {
    //   firstPoint: startingSegment.lastPoint,
    //   lastPoint: startingSegment.firstPoint,
    //   coordinates: reverted,
    //   signature: startingSegment.signature,
    //   length: startingSegment.length,
    // };
    // const segment3: Segment = {
    //   firstPoint: endingSegment.firstPoint,
    //   lastPoint: endingSegment.lastPoint,
    //   coordinates: endingSegment.coordinates,
    //   signature: endingSegment.signature,
    //   length: endingSegment.length,
    // };
    // const reverted2 = [].concat(...endingSegment.coordinates);
    // reverted2.reverse();
    // const segment4: Segment = {
    //   firstPoint: endingSegment.firstPoint,
    //   lastPoint: endingSegment.lastPoint,
    //   coordinates: reverted2,
    //   signature: endingSegment.signature,
    //   length: endingSegment.length,
    // };
    
    const shortestPath13 = this.calculator.findShortestPath(segAStart, segAEnd);
    const shortestPath14 = this.calculator.findShortestPath(segBStart, segAEnd);
    const shortestPath23 = this.calculator.findShortestPath(segAStart, segBEnd);
    const shortestPath24 = this.calculator.findShortestPath(segBStart, segBEnd);

    let shortestPath: NavigationServiceCalculatorPath | undefined = undefined;
    for (const path of [shortestPath13, shortestPath14, shortestPath23, shortestPath24]) {
      if (!path) {
        continue;
      }
      if (!path.hasReachedDestination()) {
        continue;
      }
      if (shortestPath === undefined || path.getLength() < shortestPath.getLength()) {
        shortestPath = path;
      }
    }

    console.log('final shortest path', shortestPath);
    console.log('combinedSegment', shortestPath.getCombinedSegment());

    return shortestPath?.getCombinedSegment();
  }

  private getClosestSegment(from: Vector3): {nearestSegment: Segment, nearestPoint: Vector3, coordinateIndex: number, segmentA: Segment, segmentB: Segment} | undefined {
    // find the segment using the shortest projection
    // a segment is eligible if first and last points are below the y of `from.y`

    let nearestSegment: Segment | undefined = undefined;
    let nearestPoint: Vector3 | undefined = undefined;
    let distanceToNearestSegment: number | undefined  = undefined;
    let coordinateIndex: number | undefined = undefined;
    for (const segment of this.segments) {
      const isEligible = this.getFirstPoint(segment).y <= from.y && this.getLastPoint(segment).y <= from.y;
      if (!isEligible) {
        continue;
      }
      const {nearestPoint: point, nearestDistance, coordinateIndex: nearestCoordinateIndex} = this.nearestDistanceBetweenPointAndSegment(segment, from);
      if (nearestSegment === undefined || nearestDistance < distanceToNearestSegment) {
        nearestSegment = segment;
        nearestPoint = point;
        distanceToNearestSegment = nearestDistance;
        coordinateIndex = nearestCoordinateIndex;
      }
    }

    const segmentA: Segment = {
      coordinates: []
    };
    const segmentB: Segment = {
      coordinates: []
    };

    // Maybe we need to create very small segments if the point is on the first or last point of the nearestSegment
    // currently the code is commented out as it seems that it is not required
    if (nearestPoint.equals(this.getFirstPoint(nearestSegment))) {
      // shift the point 10cm away from first point on the the first line of the segment
      // nearestPoint.add(nearestSegment.coordinates[1].clone().sub(nearestSegment.coordinates[0]).normalize().setLength(0.1));
    } else if (nearestPoint.equals(this.getLastPoint(nearestSegment))) {
      // shift the point 10cm away from last point on the the last line of the segment
      // const coordinatesLength = nearestSegment.coordinates.length;
      // nearestPoint.add(nearestSegment.coordinates[coordinatesLength - 2].clone().sub(nearestSegment.coordinates[coordinatesLength - 1]).normalize().setLength(0.1));
    }

    segmentA.coordinates.push(nearestSegment.coordinates[0]);
    segmentB.coordinates.push(nearestPoint);

    for (let index = 0; index < nearestSegment.coordinates.length - 1; index++) {
      if (index < coordinateIndex) {
        segmentA.coordinates.push(nearestSegment.coordinates[index + 1]);
      } else if (index > coordinateIndex) {
        segmentB.coordinates.unshift(nearestSegment.coordinates[index + 1]);
      } else {
        segmentA.coordinates.push(nearestPoint);
      }
    }

    segmentB.coordinates.push(this.getLastPoint(nearestSegment));
    segmentA.coordinates.reverse();
    segmentA.lastPoint = nearestSegment.firstPoint;
    segmentB.lastPoint = nearestSegment.lastPoint;

    return {nearestPoint, nearestSegment, coordinateIndex, segmentA, segmentB};
  }

  private getFirstPoint(segment: Segment): Vector3 & {pointType?: PointType} {
    const point: Vector3 & {pointType?: PointType} = segment.coordinates[0];
    point.pointType = segment.firstPoint;
    return point;
  }

  private getLastPoint(segment: Segment): Vector3 & {pointType?: PointType} {
    const point: Vector3 & {pointType?: PointType} = segment.coordinates[segment.coordinates.length - 1];
    point.pointType = segment.lastPoint;
    return point;
  }

  private nearestDistanceBetweenPointAndSegment(segment: Segment, point: Vector3): {nearestPoint: Vector3, nearestDistance: number, coordinateIndex: number} | undefined {
    let nearestDistance: number | undefined = undefined;
    let nearestPoint: Vector3 | undefined = undefined;
    let nearestCoordinateIndex: number | undefined;

    for (let index = 0; index < segment.coordinates.length - 1; index++) {
      const line = new Line3(segment.coordinates[index], segment.coordinates[index + 1]);
      const {point: currentNearestPoint, distance} = this.normalDistanceBetweenPointAndLine(line, point);
      if (nearestDistance === undefined || distance < nearestDistance) {
        nearestDistance = distance;
        nearestPoint = currentNearestPoint;
        nearestCoordinateIndex = index;
      }
    }

    return {nearestPoint, nearestDistance, coordinateIndex: nearestCoordinateIndex};
  }

  private normalDistanceBetweenPointAndLine(line: Line3, point: Vector3): {point: Vector3, distance: number} {
    const nearestPoint = new Vector3();
    line.closestPointToPoint(point, true, nearestPoint);
    return {point: nearestPoint, distance: point.distanceTo(nearestPoint)};
  }

  public findClosestBuildingDoor(point: Vector3): Vector3 | undefined {
    const points: Vector3[] = [];
    for (const segment of this.segments) {
      if (segment.firstPoint === 'building-door') {
        points.push(segment.coordinates[0]);
      } else if (segment.lastPoint === 'building-door') {
        points.push(segment.coordinates[segment.coordinates.length - 1]);
      }
    }
    let closestPoint: Vector3 | undefined = undefined;
    let distance: number | undefined = undefined;
    for (const p of points) {
      const currentDistance = point.distanceTo(p);
      if (distance === undefined || currentDistance < distance) {
        distance = currentDistance;
        closestPoint = p;
      }
    }
    return closestPoint;
  }

  public logAllPaths(scene: Scene): void {
    const logger = new Log(scene);
    for (const segment of this.segments) {
      logger.line(segment.coordinates, 'green', 1, false);
      logger.point(segment.coordinates[0], 'red', 0.5, 1, false);
      logger.point(segment.coordinates[segment.coordinates.length - 1], 'blue', 0.5, 1, false);
    }
  }

}

class NavigationServiceCalculator {

  private startingSegment: Segment;
  private endingSegment: Segment;
  private paths: NavigationServiceCalculatorPath[] = [];
  private segmentByPoint: {[key: string]: Segment[]} = {};

  constructor(segments: Segment[], private log: Log) {
    for (const segment of segments) {
      if (!segment.signature) {
        throw new Error('Only signed segment can be used in the calculator');
      }
      if (segment.length === undefined) {
        throw new Error('Only segment with .length set can be used in the calculator');
      }
      const firstPointSignature = this.getPointSignature(segment.coordinates[0]);
      const lastPointSignature = this.getPointSignature(segment.coordinates[segment.coordinates.length - 1]);
      if (this.segmentByPoint[firstPointSignature]) {
        this.segmentByPoint[firstPointSignature].push(segment);
      } else {
        this.segmentByPoint[firstPointSignature] = [segment];
      }
      if (this.segmentByPoint[lastPointSignature]) {
        this.segmentByPoint[lastPointSignature].push(segment);
      } else {
        this.segmentByPoint[lastPointSignature] = [segment];
      }
    }
  }

  private getPointSignature(point: Vector3): string {
    return point.toArray().join(',');
  }

  public findShortestPath(startingSegment: Segment, endingSegment: Segment): NavigationServiceCalculatorPath {
    this.startingSegment = startingSegment;
    this.endingSegment = endingSegment;
    this.paths.splice(0, this.paths.length);
    this.paths.push(new NavigationServiceCalculatorPath([this.startingSegment]));
    this.iterateNext();

    // here we have all path finished, let's find the shortest
    let shortestLength: number | undefined = undefined;
    let shortestPath: NavigationServiceCalculatorPath | undefined = undefined;

    for (const path of this.paths) {
      // this.log.point(path.getLastPoint(), 'blue', 1);
      if (path.hasReachedDestination() && (shortestLength === undefined || path.getLength() < shortestLength)) {
        shortestLength = path.getLength();
        shortestPath = path;
      }
    }

    return shortestPath;
  }

  private iterateNext(): void {
    let allPathFinished = true;
    for (const path of this.paths) {
      if (!path.isFinished()) {
        allPathFinished = false;
        this.iterateNextPath(path);
      }
    }
    if (!allPathFinished) {
      this.iterateNext();
    }
  }

  private iterateNextPath(path: NavigationServiceCalculatorPath): void {
    const lastPointSignature = this.getPointSignature(path.getLastPoint());
    const lastSegmentSignature = path.getLastSegment().signature;
    const eligibleSegments = this.segmentByPoint[lastPointSignature].filter(s => s.signature !== lastSegmentSignature) || [];
    if (eligibleSegments.length === 0) {
      path.finish();
      return;
    }
    const fakeArray = new Array(eligibleSegments.length - 1).fill(0);
    const newPaths = fakeArray.map(() => {
      const cloned = path.clone();
      return cloned;
    });
    const allPaths = [path];
    allPaths.push(...newPaths);
    
    // verification of length
    if (eligibleSegments.length !== allPaths.length) {
      throw new Error('Something went wrong');
    }

    for (let index = 0; index < eligibleSegments.length; index++) {
      const path = allPaths[index];
      const newSegment = eligibleSegments[index];
      try {
        path.addSegment(newSegment);
        if (!this.paths.includes(path)) {
          this.paths.push(path);
        }
        if (path.getLastPoint().equals(this.endingSegment.coordinates[0]) || path.getLastPoint().equals(this.endingSegment.coordinates[this.endingSegment.coordinates.length - 1])) {
          path.addSegment(this.endingSegment);
          path.finish();
          path.reached();
        }
      } catch (error) {
        console.warn('Error when adding segment', error.message);
      }
    }
  }

}

class NavigationServiceCalculatorPath {
  private length: number = 0;
  private segmentSignatures: string[] = [];
  private segments: Segment[] = [];
  private from: Vector3;
  private to: Vector3;
  private combinedSegment: Segment;
  private finished = false;
  private reachedDestination = false;

  constructor(segments: Segment[] = []) {
    for (const segment of segments) {
      this.addSegment(segment);
    }
  }

  public clone(): NavigationServiceCalculatorPath {
    const cloned = new NavigationServiceCalculatorPath(this.segments);
    return cloned;
  }

  public addSegment(segment: Segment): void {
    if (!segment.signature) {
      throw new Error('Only signed segment can be used in the calculator');
    }
    if (segment.length === undefined) {
      throw new Error('Only segment with .length set can be used in the calculator');
    }
    if (this.segmentSignatures.includes(segment.signature)) {
      throw new Error('Segment already belongs to the path');
    }

    const coordinates: Vector3[] = [];
    if (this.to && segment.coordinates[0].equals(this.to)) {
      coordinates.push(...segment.coordinates);
    } else if (this.to && segment.coordinates[segment.coordinates.length - 1].equals(this.to)) {
      const reverted = [].concat(...segment.coordinates);
      reverted.reverse();
      coordinates.push(...reverted);
    } else if (!this.to) {
      coordinates.push(...segment.coordinates);
    } else {
      throw new Error('Only joined segment can added to a calculator path');
    }

    if (!this.from) {
      this.from = coordinates[0];
    }
    this.segments.push(segment);
    this.segmentSignatures.push(segment.signature);
    this.to = coordinates[coordinates.length - 1];
    this.length += segment.length;

    if (!this.combinedSegment) {
      this.combinedSegment = {
        firstPoint: segment.firstPoint,
        lastPoint: segment.lastPoint,
        coordinates: [].concat(...coordinates)
      }
    } else {
      this.combinedSegment.coordinates.push(...coordinates.slice(1));
      this.combinedSegment.lastPoint = segment.lastPoint;
    }
  }

  public finish(): void {
    this.finished = true;
  }

  public isFinished(): boolean {
    return this.finished;
  }

  public reached(): void {
    this.reachedDestination = true;
  }

  public hasReachedDestination(): boolean {
    return this.reachedDestination;
  }
  public getLastPoint(): Vector3 {
    return this.to;
  }

  public getLength(): number {
    return this.length;
  }

  public getCombinedSegment(): Segment {
    return this.combinedSegment;
  }

  public getLastSegment(): Segment {
    return this.segments[this.segments.length - 1];
  }

}
