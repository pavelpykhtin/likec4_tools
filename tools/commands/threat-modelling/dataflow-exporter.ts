import * as fs from "fs";
import * as path from "path";
import { finished } from "node:stream/promises";
import { Readable } from "stream";
import { stringify } from "csv-stringify";
import { LikeC4Model } from "likec4";
import {
  getParentInteractor,
  isInteractor,
  shouldIncludeRelationship,
} from "./common";
import { filter, map, pipe } from "remeda";

interface DataflowPresentation {
  name: string;
  dataType?: string;
  protectionMeasures?: string;
  includeInAttackSurface?: boolean;
  apiImplementedIn?: string;
}

export default async function dataflowExporter(
  model: LikeC4Model,
  targetFolder: string
): Promise<string> {
  const targetFilename = path.join(targetFolder, "dataflows.csv");

  const dataflows = pipe(
    [...model.relationships()],
    filter((r: LikeC4Model.Relation) => shouldIncludeElement(r.source)),
    filter((r: LikeC4Model.Relation) => shouldIncludeElement(r.target)),
    filter((r: LikeC4Model.Relation) => shouldIncludeRelationship(r)),
    filter((r: LikeC4Model.Relation) => getParentInteractor(r.source) !== getParentInteractor(r.target)),
    filter((r: LikeC4Model.Relation) => !r.tags.find((x) => x == "infrastructureScenario")),
    filter((r: LikeC4Model.Relation) => ensureHasDataflowInfo(r)),
    map(
      (r) =>
        <DataflowPresentation>{
          name: `${r.$relationship.metadata?.dataflowId}. ${r.title}`,
          protectionMeasures: r.$relationship.metadata?.protection,
          dataType: r.$relationship.metadata?.dataType,
        }
    )
  ).toSorted((a, b) => a.name.localeCompare(b.name));

  const targetFile = fs.createWriteStream(targetFilename);
  const dataflowsStream = Readable.from(dataflows)
    .pipe(
      stringify({
        header: true,
        columns: [
          { key: "name", header: "Поток" },
          { key: "dataType", header: "Состав передаваемых данных" },
          { key: "protectionMeasures", header: "Меры защиты" },
          { key: "includeInAttackSurface", header: "Включается в ПА?" },
          { key: "apiImplementedIn", header: "Модуль, реализующий интерфейс" },
        ],
      })
    )
    .pipe(targetFile)
    .addListener("finish", () => targetFile.close());

  await finished(dataflowsStream);

  return targetFilename;
}

function shouldIncludeElement(element: LikeC4Model.Element) {
  return isInteractor(element);
}

function ensureHasDataflowInfo(relationship: LikeC4Model.Relation) {
  if (!!relationship.$relationship.metadata?.dataType) {
    return true;
  }

  console.warn(
    `Relationship ${relationship.source.id}->${relationship.target.id} "${relationship.title}" has no dataflow info`
  );
  return false;
}
