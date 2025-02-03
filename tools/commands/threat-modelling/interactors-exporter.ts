import * as fs from 'fs';
import * as path from 'path';
import { finished } from 'node:stream/promises';
import { Readable } from 'stream';
import { stringify } from 'csv-stringify';
import { DataflowDirection } from '../../model';
import { LikeC4Model } from 'likec4';
import { getParentInteractor, isInteractor, shouldIncludeRelationship } from './common';

interface Interactor {
  id: string;
  name: string;
  description: string;
  inputData: string;
  outputData: string;
}

enum ParameterDirection {
  input = 'input',
  output = 'output'
}

export default async function interactorsExporter(model: LikeC4Model, targetFolder: string): Promise<string> {
  const targetFilename = path.join(targetFolder, 'interactors.csv');

  const inputParametersMap = getParametersDataMap(model, ParameterDirection.input);
  const outputParametersMap = getParametersDataMap(model, ParameterDirection.output);

  const interactors = model
    .elements()
    .filter((x) => isInteractor(x))
    .map(
      (x) =>
        <Interactor>{
          id: x.id,
          name: x.title,
          description: x.$element.metadata?.extendedDescription || x.description,
          inputData: formatData(inputParametersMap.get(x.id) || []),
          outputData: formatData(outputParametersMap.get(x.id) || [])
        }
    );

  const targetFile = fs.createWriteStream(targetFilename);
  const interactorsStream = Readable.from(interactors)
    .pipe(
      stringify({
        header: true,
        columns: [
          { key: 'name', header: 'Объект' },
          { key: 'description', header: 'Описание' },
          { key: 'inputData', header: 'Входные данные' },
          { key: 'outputData', header: 'Выходные данные' }
        ]
      })
    )
    .pipe(targetFile);

  await finished(interactorsStream);

  return targetFilename;
}

function getParametersDataMap(model: LikeC4Model, parameterDirection: ParameterDirection) {
  const parametersMap = new Map();

  model
    .relationships()
    .filter((r) => r.$relationship.metadata?.dataType)
    .filter((r) => shouldIncludeRelationship(r))
    .forEach((r) => {
      const dataTypes = r.$relationship
        .metadata?.dataType
        .split(',')
        .map((x) => x.trim())
        .map((x) => `${x.substring(0, 1).toLowerCase()}${x.substring(1)}`);

      stripUrelatedElements(
        [getParentInteractor(r.source), getParentInteractor(r.target)],
        r.$relationship.metadata?.dataflowDirection as DataflowDirection,
        parameterDirection
      )
        .filter((e) => !!e)
        .forEach((e) => {
          if (!parametersMap.has(e.id)) {
            parametersMap.set(e.id, []);
          }

          parametersMap.get(e.id).push(...dataTypes);
        });
    });

  for (const [key, value] of parametersMap) {
    parametersMap.set(key, Array.from(new Set(value)));
  }

  return parametersMap;
}

function stripUrelatedElements(
  elements: LikeC4Model.Element[],
  dataflowDirection: DataflowDirection,
  parameterDirection: ParameterDirection
): LikeC4Model.Element[] {
  if (dataflowDirection === 'bidirectional') {
    return elements;
  }

  if (parameterDirection === 'input') {
    if (dataflowDirection === 'reverse') {
      return [elements[0]];
    } else {
      return [elements[1]];
    }
  } else {
    if (parameterDirection === 'output') {
      if (dataflowDirection === 'reverse') {
        return [elements[1]];
      } else {
        return [elements[0]];
      }
    }
  }
}

function formatData(dataTypeList: string[]): string {
  return dataTypeList.join(', ');
}
