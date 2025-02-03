import * as path from "path";
import { Command } from "commander";
import relationshipsExporter from "./relationships-exporter";
import { CommonOptions, appendCommonOptions } from "../common-options";
import { LikeC4 } from "likec4";

interface ExportRelationshipsCommandOptions extends CommonOptions {
  target: string;
}

export const ExportRelationshipsCommand = appendCommonOptions(
  new Command("export-relationships")
    .description(
      "Export relationships between components and their metadata as CSV"
    )
    .option("-t, --target <filename>", "Target filename", "relationships.csv")
    .action(async (options: ExportRelationshipsCommandOptions) => {
      const likec4 = await LikeC4.fromWorkspace(options.workspace);
      const model = likec4.computedModel();

      const targetFilename = path.resolve(
        path.dirname(options.workspace),
        path.join(options.outputDir, options.target)
      );

      relationshipsExporter(model, targetFilename);
    })
);
