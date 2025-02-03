import * as path from "path";
import { Command, Option } from "commander";
import { CommonOptions, appendCommonOptions } from "../common-options";
import { ConfluenceUploader } from "../../confluence-uploader";
import { LikeC4 } from "likec4";
import componentRelationshipsExporter from "./component-relationships-exporter";

interface ExportComponentRelationshipsCommandOptions extends CommonOptions {
  component: string;
  upload: boolean;
  confluenceHost: string;
  confluencePageId: string;
  confluenceToken: string;
}

export const ExportComponentRelationshipsCommand = appendCommonOptions(
  new Command("export-component-relationships")
    .description(
      "Export artifacts related to Data Lake component. All artifacts will be placed in <output-dir>/dataLake folder."
    )
    .addOption(
      new Option(
        "--component <fqn>",
        "Сomponent FQN (e.g. 'system.subsystem.component')"
      ).env("COMPONENT_ID")
    )
    .option("-u, --upload", "Upload artifacts to Confluence", false)
    .addOption(
      new Option("--confluence-host <url>", "Confluence host")
        .env("CONFLUENCE_HOST")
        .default("")
    )
    .addOption(
      new Option(
        "--confluence-page-id <id>",
        "Confluence page to attach uploaded file"
      )
        .env("CONFLUENCE_PAGE_ID")
        .default("")
    )
    .addOption(
      new Option("--confluence-token <token>", "Confluence access token")
        .env("CONFLUENCE_TOKEN")
        .default("")
    )
    .showHelpAfterError(true)
    .action(async (options: ExportComponentRelationshipsCommandOptions) => {
      console.log(options);
      if (!options.component) {
        throw new Error("Component FQN is required");
      }
      if (
        options.upload &&
        (!options.confluenceHost || !options.confluencePageId)
      ) {
        throw new Error(
          "Confluence host and page-id are required when --upload is specified"
        );
      }

      const likec4 = await LikeC4.fromWorkspace(options.workspace);
      const model = likec4.computedModel();
      const targetFolder = path.resolve(
        path.dirname(options.workspace),
        path.join(options.outputDir, options.component)
      );

      const artifacts = [
        await componentRelationshipsExporter(
          options.component,
          model,
          targetFolder
        ),
      ];

      if (!options.upload) {
        return;
      }

      const confluenceUploader = new ConfluenceUploader({
        host: options.confluenceHost,
        token: options.confluenceToken,
      });

      for (const artifact of artifacts) {
        await confluenceUploader.upload(artifact, options.confluencePageId);
      }
    })
);
