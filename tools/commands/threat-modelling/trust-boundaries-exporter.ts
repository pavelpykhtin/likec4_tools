import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";
import { stringify } from "csv-stringify";
import { type TrustBoundary } from "../../model";
import { finished } from "node:stream/promises";

export default async function trustBoundariesExporter(
  trustBoundaries: TrustBoundary[],
  targetFolder: string
): Promise<string> {
  const targetFilename = path.join(targetFolder, "trust-boundaries.csv");
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  const trustBoundariesList = flattenTrustBoundaries(trustBoundaries);

  const targetFile = fs.createWriteStream(targetFilename);
  const trustBoundariesStream = Readable.from(trustBoundariesList)
    .pipe(
      stringify({
        header: true,
        columns: [
          { key: "name", header: "Граница доверия" },
          { key: "description", header: "Описание" },
        ],
      })
    )
    .pipe(targetFile);

  await finished(trustBoundariesStream);

  return targetFilename;
}

function flattenTrustBoundaries(boundaries: TrustBoundary[]): TrustBoundary[] {
  return [
    ...boundaries,
    ...boundaries.reduce(
      (acc: TrustBoundary[], x: TrustBoundary) =>
        acc.concat(...flattenTrustBoundaries(x.childBoundaries)),
      []
    ),
  ];
}
