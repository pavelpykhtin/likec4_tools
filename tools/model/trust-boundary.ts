import { LikeC4Model } from 'likec4';

export interface TrustBoundary {
    id: string
    name: string
    description?: string
    items: LikeC4Model.Element[],
    childBoundaries: TrustBoundary[],
    parent?: TrustBoundary
}