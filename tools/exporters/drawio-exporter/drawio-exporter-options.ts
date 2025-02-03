import * as fs from 'fs';
import { ViewPresentation, RelationshipPresentation, GroupPresentation } from './presentation';
import { DiagramEdge, DiagramView } from 'likec4';

export interface DrawioExporterOptions {
    viewFilter?: (view: DiagramView) => boolean,
    beforeWriteContent?: (targetFile: any, view: ViewPresentation) => void
    viewNameFormatter?: (view: DiagramView) => string
    relationshipFormatter?: (connection: DiagramEdge, model: DiagramView) => RelationshipPresentation,
    afterLayoutCompleted?: (view: ViewPresentation) => void,
    groupFormatter?: { [key: string]: (targetFile: fs.WriteStream, group: GroupPresentation) => void }
};