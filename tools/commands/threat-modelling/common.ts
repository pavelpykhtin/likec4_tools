import { LikeC4Model } from "likec4";
import { ElementType } from "../../model";

export function isInteractor(element: LikeC4Model.Element): boolean {
  const interactorKinds = [
    ElementType.softwareSystem,
    ElementType.externalSystem,
    ElementType.person
  ];
  return (
    !!interactorKinds.includes(element.kind as ElementType) ||
    "true".localeCompare(<string>element.$element.metadata?.isInteractor) === 0
  );
}

export function getParentInteractor(
  element: LikeC4Model.Element
): LikeC4Model.Element {
  let interactor = element;
  const elements = [element, ...element.ancestors()];

  let i = 0;
  do {
    interactor = elements[i];
    i++;
  } while (i < elements.length && !isInteractor(elements[i]));

  return interactor;
}
export function shouldIncludeRelationship(
  relationship: { kind: string | null }
): boolean {
  return relationship.kind != "postMvp";
}
