import * as fs from 'fs';
import { type TrustBoundary } from '../../model';
import { LikeC4Model } from 'likec4';

export default function trustBoundariesParser(sourceFilename: string, model: LikeC4Model): TrustBoundary[] {
  if (!fs.existsSync(sourceFilename)) {
    return [];
  }

  const elementMap: Map<string, LikeC4Model.Element> = new Map([...model.elements()].map((x: LikeC4Model.Element) => [x.id, x]));

  const sourceBoundaries = JSON.parse(fs.readFileSync(sourceFilename, 'utf8'));

  return sourceBoundaries.map((x: any) => inflateBoundary(x, null, elementMap));
}

function inflateBoundary(
  sourceDefinition: any,
  parentBoundary: TrustBoundary | null,
  elementsByKey: Map<string, LikeC4Model.Element>
) {
  const boundary = <TrustBoundary>{
    name: sourceDefinition.name,
    description: sourceDefinition.description,
    id: crypto.randomUUID(),
    items: new Array<LikeC4Model.Element>(),
    childBoundaries: [],
    parent: parentBoundary
  };

  for (const itemKey of sourceDefinition.items.filter((x: any) => typeof x === 'string')) {
    const element = elementsByKey.get(itemKey);

    if (!element) {
      console.warn(`Could not find boundary item with key ${itemKey}`);
      continue;
    }

    boundary.items.push(element);
  }

  boundary.childBoundaries = sourceDefinition.items
    .filter((x: any) => typeof x !== 'string')
    .map((x: any) => inflateBoundary(x, boundary, elementsByKey));

  return boundary;
}
