import { DiagramNode } from 'likec4';
import { type Rectangle } from './rectangle';

export interface ElementPresentation extends Rectangle {
    id: string,
    source: DiagramNode,
    type: string,
    isExternal: boolean
};