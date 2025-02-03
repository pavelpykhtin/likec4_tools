import { Command } from "commander";
import { CommonOptions, appendCommonOptions } from "./common-options";
import { LikeC4 } from "likec4";
import { filter, pipe, sort } from "remeda";

export const DummyCommand = appendCommonOptions(
  new Command("tmp")
    .description("Command for quick queries to model")
    .action(async (options: CommonOptions) => {
      const likec4 = await LikeC4.fromWorkspace(options.workspace);
      const model = likec4.computedModel();

      pipe(
        [...model.relationships()],
        filter((r) => r.source.kind == "softwareSystem"),
        filter((r) => r.target.kind == "softwareSystem"),
        filter((r) => r.technology?.toLowerCase().includes("http") || !r.technology),
        filter((r) => !r.tags.find((x) => x.localeCompare("asIs") === 0)),
        filter((r) => !r.tags.find((x) => x.localeCompare("ssoScenario") === 0)),
        filter((r) => !r.tags.find((x) => x.localeCompare("postMvp") === 0)),
        sort((a, b) => a.target.title.localeCompare(b.target.title))
      )
        .forEach((r) => {
          console.log(
            `${r.source.title} - ${r.target.title}\t${r.title}\t${r.technology || "none"}`
          );
        });
    })
);
