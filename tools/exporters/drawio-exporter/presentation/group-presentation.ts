import { Rectangle } from './rectangle';

export interface GroupPresentation extends Rectangle {
    id: string;
    title: string;
    type: string;
}