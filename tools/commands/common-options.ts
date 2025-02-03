import { Command } from 'commander';

export interface CommonOptions {
    workspace: string,
    outputDir: string
};

export function appendCommonOptions(program: Command) {
    return program
        .requiredOption('-w, --workspace <path>', 'Path to project workspace', './')
        .requiredOption('-o, --output-dir <path>', 'Output directory relative to workspace.', './artifacts');
}