import { program } from "commander";
import { ExportThreatModelCommand } from "./commands/threat-modelling/export-threat-model-command";
import { ExportRelationshipsCommand } from "./commands/relationships/export-relationships-command";
import { ValidateProtocolsCommand } from "./commands/relationships/validate-protocols-command";
import { ExportComponentRelationshipsCommand } from "./commands/component-relationships/export-component-relationships-command";
import { DummyCommand } from "./commands/dummy-command";

program
  .addCommand(ExportThreatModelCommand)
  .addCommand(ExportRelationshipsCommand)
  .addCommand(ExportComponentRelationshipsCommand)
  .addCommand(ValidateProtocolsCommand)
  .addCommand(DummyCommand);

program.parse(process.argv);
