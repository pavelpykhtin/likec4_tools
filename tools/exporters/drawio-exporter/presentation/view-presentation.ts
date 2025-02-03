import { ElementPresentation } from './element-presentation';
import { GroupPresentation } from './group-presentation';
import { RelationshipPresentation } from './relationship-presentation';

export interface ViewPresentation {
    id: string,
    name: string,
    elements: ElementPresentation[],
    relationships: RelationshipPresentation[]
    groups: GroupPresentation[]
}