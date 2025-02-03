import * as fs from "fs";
import { ElementType } from "../../model";
import { forEach, entries } from "remeda";
import { LikeC4Model } from "likec4";

type AtomicRelationship = {
  origin: LikeC4Model.Relation;
  description: string;
};

export default function relationshipsExporter(
  model: LikeC4Model,
  targetFilename: string
) {
  const targetFile = fs.createWriteStream(targetFilename);

  targetFile.write("key;source;target;description;technology\n");

  const relationshipsInScope = model
    .relationships()
    .filter((r) => isInScope(r.source))
    .filter((r) => isInScope(r.target))
    .filter((r) => r.tags.every((t) => t.localeCompare("asIs")))
    .flatMap((r) =>
      r.title.split(/\n|\r\n/).map((d) => ({
        origin: r,
        description: d,
      }))
    );

  const grouppedRelationships = relationshipsInScope.reduce((acc, r) => {
    const key = getKey(r.origin);
    return {
      ...acc,
      [key]: [...(acc[key] || []), r],
    };
  }, {} as { [key: string]: AtomicRelationship[] });

  for (const [key, relationships] of entries(grouppedRelationships)) {
    forEach(relationships, (relationship, index) =>
      exportRelationship(
        relationship,
        relationships.length > 1 ? index + 1 : 0,
        targetFile
      )
    );
  }
}

function exportRelationship(
  relationship: AtomicRelationship,
  index: number,
  targetFile: fs.WriteStream
) {
  const source = relationship.origin.source.title;
  const target = relationship.origin.target.title;
  const description = relationship.description;
  const technology = relationship.origin.technology || "";
  const key = getKey(relationship.origin, index);

  targetFile.write(`${key};${source};${target};${description};${technology}\n`);
}

function getKey(relationship: LikeC4Model.Relation, index?: number) {
  return `${relationship.source.id}_${relationship.target.id}${
    index ? `_${index}` : ""
  }`.toLocaleLowerCase();
}

function isInScope(element: LikeC4Model.Element) {
  return (
    element.kind === ElementType.softwareSystem ||
    element.kind === ElementType.externalSystem ||
    element.kind === ElementType.person
  );
}
