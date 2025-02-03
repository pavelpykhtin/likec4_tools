import * as fs from 'fs';
import * as path from 'path';
import { finished } from 'node:stream/promises';
import { Readable } from 'stream';
import { stringify } from 'csv-stringify';
import { LikeC4Model } from 'likec4';

interface RelationshipPresentation {
    name: string;
    source: string;
    target: string;
    dataType?: string;    
};

export default async function componentRelationshipsExporter(componentId: string, model: LikeC4Model, targetFolder: string): Promise<string> {
    fs.mkdirSync(targetFolder, { recursive: true });
    const targetFilename = path.join(targetFolder, 'relationships.csv');

    const component = model.findElement(componentId);
    const dataflows = [...component.allIncoming, ...component.allOutgoing]
        .map(r => (<RelationshipPresentation>{
            name: r.description || r.title,
            source: r.source.title,
            target: r.target.title,
            dataType: r.$relationship.metadata?.dataType
        }))
        .toSorted((a, b) => a.source.localeCompare(b.source));

    const targetFile = fs.createWriteStream(targetFilename);
    const dataflowsStream = Readable.from(dataflows)
        .pipe(stringify({
            header: true,
            columns: [
                { key: 'name', header: 'Взаимодействие' },
                { key: 'source', header: 'Компонент-инициатор' },
                { key: 'target', header: 'Компонент-цель' },
                { key: 'dataType', header: 'Состав передаваемых данных' },
            ]
        }))
        .pipe(targetFile)
        .addListener('finish', () => targetFile.close());

    await finished(dataflowsStream);

    return targetFilename;
}