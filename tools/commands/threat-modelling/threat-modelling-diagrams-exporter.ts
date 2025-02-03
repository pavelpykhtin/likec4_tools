import * as path from 'path';
import * as fs from 'fs';
import { DrawioExporter, getRectangle } from '../../exporters/drawio-exporter/drawio-exporter';
import LayoutConstants from '../../exporters/drawio-exporter/layout-constants';

import { DataflowDirection, RelationshipWellknownProperties, TrustBoundary } from '../../model';
import {
  ViewPresentation,
  ElementPresentation,
  GroupPresentation,
  RelationshipPresentation
} from '../../exporters/drawio-exporter/presentation';
import { DrawioExporterOptions } from '../../exporters/drawio-exporter/drawio-exporter-options';
import { TrustBoundaryPresentation } from './trust-boundary-presentation';
import { DiagramEdge, DiagramView, LikeC4Model } from 'likec4';
import { shouldIncludeRelationship } from './common';
import { DeploymentRelationModel, RelationshipModel } from 'likec4/model';

type KnownProperties = {
  dataType?: string;
  dataflowId?: string;
  dataflowDirection?: DataflowDirection;
};

export class ThreatModellingDiagramsExporter extends DrawioExporter {
  constructor(protected model: LikeC4Model, scale?: number) {
    super(model, scale);
  }

  export(model: LikeC4Model.Layouted, trustBoundaries: TrustBoundary[], targetFolder: string): Promise<string> {
    const targetFilename = path.join(targetFolder, 'diagrams.drawio.xml');

    const dataflowsExporterOptions = <DrawioExporterOptions>{
      viewFilter: (view: DiagramView) => !!view.tags.find(x => x == 'scenarioView'),
      afterLayoutCompleted: (view: ViewPresentation) => {
        view.groups.push(...this.buildTrustBoundaryPresentation(view, trustBoundaries));
      },
      viewNameFormatter: (view: DiagramView) => view.title,
      relationshipFormatter: this.dataflowRelationshipFormatter(),
      groupFormatter: {
        trustBoundary: this.writeTrustBoundary()
      }
    };

    super.exportInternal(model, targetFilename, dataflowsExporterOptions);

    return Promise.resolve(targetFilename);
  }

  private dataflowRelationshipFormatter(): (connection: DiagramEdge, _: DiagramView) => RelationshipPresentation {
    return (connection: DiagramEdge, _: DiagramView) => {
      const presentation = connection.relations
        .map((x) => this.model.relationship(x))
        .filter((x) => shouldIncludeRelationship(x))
        .reduce(
          (acc, modelRelationship) => {
            let properties: RelationshipWellknownProperties = {
              dataflowDirection: DataflowDirection.default,
              ...{ dataType: modelRelationship.$relationship.metadata?.dataType },
              ...{ dataflowId: modelRelationship.$relationship.metadata?.dataflowId },
              ...{ dataflowDirection: modelRelationship.$relationship.metadata?.dataflowDirection as DataflowDirection }
            };

            const relationshipReversed = properties.dataflowDirection == DataflowDirection.reverse;
            const reversed = acc.reversed ?? relationshipReversed;

            const relationSides = [connection.source, connection.target];

            if (relationshipReversed) {
              relationSides.reverse();
            }

            const description = this.getRelationshipDescription(
              modelRelationship,
              properties,
              relationshipReversed != reversed
            );

            return Object.assign(acc, {
              description: acc.description ? `${acc.description}\n${description}` : description,
              sourceId: acc.sourceId ?? relationSides[0],
              targetId: acc.targetId ?? relationSides[1],
              bidirectional: acc.bidirectional ?? properties.dataflowDirection == DataflowDirection.bidirectional,
              reversed: reversed
            });
          },
          {
            id: connection.id,
            description: '',
            source: connection,
            fontSize: LayoutConstants.relationshipFontSize,
            sourceId: null,
            targetId: null,
            bidirectional: null,
            reversed: null,
            points: []
          }
        );

      let points = connection.controlPoints || connection.points.map((p) => ({ x: p[0], y: p[1] }));
      points = presentation.reversed ? points.toReversed() : points;
      presentation.points = points.map((p) => ({ x: p.x * this.scale, y: p.y * this.scale }));

      return presentation;
    };
  }

  private getRelationshipDescription(
    relationship: RelationshipModel | DeploymentRelationModel,
    properties: KnownProperties,
    shouldBeReverted: boolean
  ): string {
    const parts = [];
    if (!!properties.dataType) {
      parts.push(`${properties.dataflowId}. ${properties.dataType}`);

      shouldBeReverted && parts.push(' (r)');
    } else {
      parts.push(relationship.title);

      shouldBeReverted && parts.push(' (r)');
      relationship.$relationship.technology && parts.push(`\n[${relationship.$relationship.technology}]`);
    }

    return parts.join('');
  }

  private buildTrustBoundaryPresentation(view: ViewPresentation, trustBoundaries: TrustBoundary[]) {
    const elementPresentationsById = new Map([...view.elements, ...view.groups].map((x) => [x.id, x]));

    return trustBoundaries.reduce((acc, x) => acc.concat(...this.walkBoundaries(x, elementPresentationsById)), []);
  }

  private writeTrustBoundary(): (targetFile: fs.WriteStream, boundary: GroupPresentation) => void {
    return (targetFile, boundary) =>
      targetFile.write(
        `<mxCell id="${boundary.id}" value="${boundary.title}" style="rounded=0;whiteSpace=wrap;html=1;fillColor=none;fontSize=32;labelPosition=center;verticalLabelPosition=middle;align=left;verticalAlign=bottom;spacingBottom=10;strokeColor=#FF0000;strokeWidth=4;dashed=1;dashPattern=12 12;spacingLeft=10;" parent="tpl-1" vertex="1"><mxGeometry x="${boundary.x}" y="${boundary.y}" width="${boundary.width}" height="${boundary.height}" as="geometry" /></mxCell>`
      );
  }

  private walkBoundaries(
    boundary: TrustBoundary,
    elementPresentationsById: Map<string, ElementPresentation | GroupPresentation>
  ): TrustBoundaryPresentation[] {
    const content = boundary.items.map((x) => elementPresentationsById.get(x.id)).filter((x) => !!x);

    const innerBoundaries = boundary.childBoundaries.reduce(
      (acc, x) => acc.concat(...this.walkBoundaries(x, elementPresentationsById)),
      []
    );
    content.push(...innerBoundaries);

    if (content.length === 0) {
      return [];
    }

    const rectangle = getRectangle(content);

    return [
      {
        title: boundary.name,
        id: boundary.id,
        type: 'trustBoundary',
        ...rectangle
      },
      ...innerBoundaries
    ];
  }
}
