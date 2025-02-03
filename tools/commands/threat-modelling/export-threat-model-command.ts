import * as path from 'path';
import trustBoundariesExporter from '../threat-modelling/trust-boundaries-exporter';
import dataflowExporter from '../threat-modelling/dataflow-exporter';
import interactorsExporter from '../threat-modelling/interactors-exporter';
import { Command, Option } from 'commander';
import { CommonOptions, appendCommonOptions } from '../common-options';
import { ConfluenceUploader } from '../../confluence-uploader';
import { LikeC4 } from 'likec4';
import trustBoundariesParser from './trust-boundary-parser';
import { ThreatModellingDiagramsExporter } from './threat-modelling-diagrams-exporter';

interface ExportThreatModelCommandOptions extends CommonOptions {
  upload: boolean;
  confluenceHost: string;
  confluencePageId: string;
  confluenceToken: string;
}

export const ExportThreatModelCommand = appendCommonOptions(
  new Command('export-threat-model')
    .description(
      'Export artifacts related to threat modelling. All artifacts will be placed in <output-dir>/threatModelling folder.'
    )
    .option('-u, --upload', 'Upload artifacts to Confluence', false)
    .addOption(new Option('--confluence-host <url>', 'Confluence host').env('CONFLUENCE_HOST').default(''))
    .addOption(
      new Option('--confluence-page-id <id>', 'Confluence page to attach uploaded file')
        .env('CONFLUENCE_PAGE_ID')
        .default('')
    )
    .addOption(new Option('--confluence-token <token>', 'Confluence access token').env('CONFLUENCE_TOKEN').default(''))
    .showHelpAfterError(true)
    .action(async (options: ExportThreatModelCommandOptions) => {
      if (options.upload && (!options.confluenceHost || !options.confluencePageId)) {
        throw new Error('Confluence host and page-id are required when --upload is specified');
      }

      const likec4 = await LikeC4.fromWorkspace(options.workspace);
      const model = likec4.computedModel();

      const trustBoundariesFile = path.resolve(options.workspace, 'trustBoundaries.json');
      const trustBoundaries = trustBoundariesParser(trustBoundariesFile, model);

      const targetFolder = path.resolve(
        path.dirname(options.workspace),
        path.join(options.outputDir, 'threatModelling')
      );

      const artifacts = [
        await new ThreatModellingDiagramsExporter(model, 1.5).export(await likec4.layoutedModel(), trustBoundaries, targetFolder),
        await trustBoundariesExporter(trustBoundaries, targetFolder),
        await dataflowExporter(model, targetFolder),
        await interactorsExporter(model, targetFolder)
      ];

      if (!options.upload) {
        return;
      }

      const confluenceUploader = new ConfluenceUploader({
        host: options.confluenceHost,
        token: options.confluenceToken
      });

      for (const artifact of artifacts /*.filter(x => path.extname(x).localeCompare('.csv') === 0)*/) {
        await confluenceUploader.upload(artifact, options.confluencePageId);
      }
    })
);
