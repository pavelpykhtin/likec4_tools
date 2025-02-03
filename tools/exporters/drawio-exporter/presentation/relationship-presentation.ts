import { LikeC4DiagramModel } from 'likec4';
import { Point } from './point';

export interface RelationshipPresentation {
    id: string,
    bidirectional: boolean,
    points: Point[],
    description: string,
    fontSize: number,
    sourceId: string,
    targetId: string
    source: LikeC4DiagramModel.Connection,
};