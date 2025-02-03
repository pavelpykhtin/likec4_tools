import { DataflowDirection } from './dataflow-direction';

export interface ElementWellknownProperties {
    extendedDescription?: string
}

export interface RelationshipWellknownProperties {
    dataflowId?: string
    dataType?: string
    dataflowDirection?: DataflowDirection
    extendedDescription?: string
    protection?: string
}