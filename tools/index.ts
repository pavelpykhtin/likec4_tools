import { createCustomLanguageServices, LikeC4Module } from '@likec4/language-server';
import { GraphvizLayouter } from '@likec4/layouts';
import { GraphvizBinaryAdapter } from '@likec4/layouts/graphviz/binary';
import { NodeFileSystem } from 'langium/node';
import { createLikeC4Logger } from './logger.ts';
import * as path from 'path';
import { pathToFileURL } from 'node:url';

const logger = createLikeC4Logger();
const toolsModule = {
    logger: () => logger,
    likec4: {
        Layouter: () => new GraphvizLayouter(new GraphvizBinaryAdapter())
    }
};

const languageServices = createCustomLanguageServices(NodeFileSystem, toolsModule);

const module: LikeC4Module = languageServices.likec4;
const modelBuilder = module.likec4.ModelBuilder;
const workspaceManager = module.shared.workspace.WorkspaceManager;
const documentBuilder = module.shared.workspace.DocumentBuilder;
const langiumDocuments = module.shared.workspace.LangiumDocuments;

await workspaceManager.initializeWorkspace(
    [{
        name: path.basename('./arch'),
        uri: pathToFileURL('./arch').toString()
    }]
);

const documents = langiumDocuments.all.toArray();
await documentBuilder.build(documents, { validation: true });

const model = await modelBuilder.buildComputedModel();
    
console.log('hello');