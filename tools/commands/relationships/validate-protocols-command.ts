import { Command } from "commander";
import { CommonOptions, appendCommonOptions } from "../common-options";
import { ProtocolsValidator } from "./protocols-validator";
import { LikeC4 } from "likec4";

interface ValidateProtocolsCommandOptions extends CommonOptions {
  ignoreProtocols?: boolean;
  ignoreProtection?: boolean;
}

export const ValidateProtocolsCommand = appendCommonOptions(
  new Command("validate-protocols")
    .description(
      "Ensure that all relationships has information about protocols and protection mechanisms"
    )
    .option("--ignore-protocols", "Ignore missing protocols", false)
    .option("--ignore-protection", "Ignore missing protection", false)
    .action(async (options: ValidateProtocolsCommandOptions) => {
      const likec4 = await LikeC4.fromWorkspace(options.workspace);
      const model = likec4.computedModel();

      const validator = new ProtocolsValidator(model, options);

      const errors = [...validator.validate()];
      errors.forEach((x) => console.error(x.message));
      if (errors.length > 0) {
        console.log(`${errors.length} errors found`);
      }
    })
);
