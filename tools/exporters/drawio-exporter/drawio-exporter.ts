import * as fs from 'fs';
import LayoutConstants from './layout-constants';
import { DrawioExporterOptions } from './drawio-exporter-options';
import { ElementType } from '../../model';
import {
  ViewPresentation,
  ElementPresentation,
  RelationshipPresentation,
  GroupPresentation,
  Rectangle
} from './presentation';
import { DiagramEdge, DiagramNode, DiagramView, LikeC4Model } from 'likec4';

interface Boundary {
  parent: LikeC4Model.Element;
  type: ElementType;
  elements: ElementPresentation[];
}

export class DrawioExporter {
  protected scale: number;

  constructor(protected model: LikeC4Model, scale?: number) {
    this.scale = scale || 1;
  }

  protected exportInternal(model: LikeC4Model.Layouted, targetFilename: string, options?: DrawioExporterOptions) {
    const targetFile = fs.createWriteStream(targetFilename);
    options = {
      ...this.getDefaultOptions(),
      ...options,
      groupFormatter: { ...this.getDefaultOptions().groupFormatter, ...(options || {}).groupFormatter }
    };

    targetFile.write('<?xml version="1.0" encoding="UTF-8"?><mxfile type="atlas">');

    model.views()
      .map(x => x.$view)
      .map(x => { console.log(x) ;return x;})
      .filter(options.viewFilter)
      .map((view) => this.buildViewPresentation(view, options))
      .forEach((view) => this.writeView(targetFile, view, options));

    targetFile.write('</mxfile>');

    targetFile.close();
  }

  private buildViewPresentation(model: DiagramView, options: DrawioExporterOptions): ViewPresentation {
    const leafElements = this.getLeafElements(model);

    const viewPresentation = <ViewPresentation>{
      id: model.id,
      name: options.viewNameFormatter(model),
      elements: leafElements.map((x) => this.buildElementPresentation(x, model, options)),
      relationships: model.edges.map((x) => this.buildRelationshipPresentation(x, model, options)),
      groups: []
    };

    viewPresentation.groups = this.buildGroupsPresentation(model, viewPresentation);

    options.afterLayoutCompleted(viewPresentation);

    return viewPresentation;
  }

  private buildGroupsPresentation(model: DiagramView, viewPresentation: ViewPresentation): GroupPresentation[] {
    const boundaryMap = new Map<string, Boundary>();
    const elementPresentationById = new Map<string, ElementPresentation>(
      viewPresentation.elements.map((x) => [x.id, x])
    );

    for (const element of model.nodes) {
      const parentId = element.parent;
      if (!parentId) continue;

      const parent = this.model.element(parentId);
      let group = boundaryMap.get(parentId);
      if (!group) {
        group = {
          parent: parent,
          type: parent.kind as ElementType,
          elements: []
        };
        boundaryMap.set(parentId, group);
      }
      group.elements.push(elementPresentationById.get(element.id));
    }

    return Array.from(boundaryMap.values()).map(
      (x) =>
        <GroupPresentation>{
          id: x.parent.id,
          title: x.parent.title,
          type: x.type,
          ...getRectangle(x.elements)
        }
    );
  }

  private buildElementPresentation(
    element: DiagramNode,
    view: DiagramView,
    options: DrawioExporterOptions
  ): ElementPresentation {
    let dimensions = {
      width: LayoutConstants.nodeWidth,
      height: LayoutConstants.nodeHeight
    };

    if (element.kind === ElementType.person) {
      dimensions = {
        width: LayoutConstants.personWidth,
        height: LayoutConstants.personHeight
      };
    }

    return <ElementPresentation>{
      id: element.id,
      source: element,
      type: this.kindToElementType(element.kind),
      x: element.position[0] * this.scale,
      y: element.position[1] * this.scale,
      isExternal: element.kind === ElementType.externalSystem,
      ...dimensions
    };
  }

  private buildRelationshipPresentation(connection: DiagramEdge, model: DiagramView, options: DrawioExporterOptions) {
    return options.relationshipFormatter(connection, model);
  }

  private writeView(targetFile: fs.WriteStream, viewPresentation: ViewPresentation, options: DrawioExporterOptions) {
    targetFile.write(
      `<diagram id="view-${viewPresentation.id}" name="${viewPresentation.name}"><mxGraphModel ><root><mxCell id="tpl-0" /><mxCell id="tpl-1" parent="tpl-0" />`
    );

    options.beforeWriteContent(targetFile, viewPresentation);

    this.writeGroups(targetFile, viewPresentation, options);

    viewPresentation.elements.forEach((element) => this.writeElement(targetFile, element));
    viewPresentation.relationships.forEach((relationship) => this.writeRelation(targetFile, relationship, options));

    this.writeViewTitle(targetFile, viewPresentation);

    targetFile.write(`</root></mxGraphModel></diagram>`);
  }

  private writeElement(targetFile: fs.WriteStream, element: ElementPresentation) {
    switch (element.type) {
      case 'softwareSystem':
        this.writeSoftwareSystem(targetFile, element);
        break;
      case 'externalSystem':
        this.writeExternalSystem(targetFile, element);
        break;
      case 'container':
        this.writeContainer(targetFile, element);
        break;
      case 'component':
        this.writeComponent(targetFile, element);
        break;
      case 'person':
        this.writePerson(targetFile, element);
        break;
    }
  }

  private writeSoftwareSystem(targetFile: fs.WriteStream, element: ElementPresentation) {
    targetFile.write(
      `<object placeholders="1" c4Name="${this.sanitize(
        element.source.title
      )}" c4Type="Software System" c4Description="" label="&lt;font style=&quot;font-size: ${
        LayoutConstants.elementFontSize
      }px&quot;&gt;&lt;b&gt;%c4Name%&lt;/b&gt;&lt;/font&gt;&lt;div&gt;[%c4Type%]&lt;/div&gt;&lt;br&gt;&lt;div&gt;&lt;font style=&quot;font-size: 11px&quot;&gt;&lt;font color=&quot;#cccccc&quot;&gt;%c4Description%&lt;/font&gt;&lt;/div&gt;" id="${
        element.source.id
      }"><mxCell style="rounded=1;whiteSpace=wrap;html=1;labelBackgroundColor=none;fillColor=#1061B0;fontColor=#ffffff;align=center;arcSize=10;strokeColor=#0D5091;metaEdit=1;allowArrows=0;resizable=0;points=[[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];" vertex="1" parent="tpl-1"><mxGeometry x="${
        element.x
      }" y="${element.y}" width="${element.width}" height="${element.height}" as="geometry" /></mxCell></object>`
    );
  }

  private writeExternalSystem(targetFile: fs.WriteStream, element: ElementPresentation) {
    targetFile.write(
      `<object placeholders="1" c4Name="${this.sanitize(
        element.source.title
      )}" c4Type="Software System" c4Description="" label="&lt;font style=&quot;font-size: ${
        LayoutConstants.elementFontSize
      }px&quot;&gt;&lt;b&gt;%c4Name%&lt;/b&gt;&lt;/font&gt;&lt;div&gt;[%c4Type%]&lt;/div&gt;&lt;br&gt;&lt;div&gt;&lt;font style=&quot;font-size: 11px&quot;&gt;&lt;font color=&quot;#cccccc&quot;&gt;%c4Description%&lt;/font&gt;&lt;/div&gt;" id="${
        element.source.id
      }"><mxCell style="rounded=1;whiteSpace=wrap;html=1;labelBackgroundColor=none;fillColor=#8C8496;fontColor=#ffffff;align=center;arcSize=10;strokeColor=#736782;metaEdit=1;resizable=0;points=[[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];" vertex="1" parent="tpl-1"><mxGeometry x="${
        element.x
      }" y="${element.y}" width="${element.width}" height="${element.height}" as="geometry" /></mxCell></object>`
    );
  }

  private writeContainer(targetFile: fs.WriteStream, element: ElementPresentation) {
    targetFile.write(
      `<object placeholders="1" c4Name="${this.sanitize(
        element.source.title
      )}" c4Type="Container" c4Technology="e.g. SpringBoot, ElasticSearch, etc." c4Description="Description of container role/responsibility." label="&lt;font style=&quot;font-size: ${
        LayoutConstants.elementFontSize
      }px&quot;&gt;&lt;b&gt;%c4Name%&lt;/b&gt;&lt;/font&gt;&lt;div&gt;[%c4Type%: %c4Technology%]&lt;/div&gt;&lt;br&gt;&lt;div&gt;&lt;font style=&quot;font-size: 11px&quot;&gt;&lt;font color=&quot;#E6E6E6&quot;&gt;%c4Description%&lt;/font&gt;&lt;/div&gt;" id="${
        element.source.id
      }"><mxCell style="rounded=1;whiteSpace=wrap;html=1;fontSize=11;labelBackgroundColor=none;fillColor=#23A2D9;fontColor=#ffffff;align=center;arcSize=10;strokeColor=#0E7DAD;metaEdit=1;resizable=0;points=[[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];" vertex="1" parent="tpl-1"><mxGeometry x="${
        element.x
      }" y="${element.y}" width="${element.width}" height="${element.height}" as="geometry" /></mxCell></object>`
    );
  }

  private writeComponent(targetFile: fs.WriteStream, element: ElementPresentation) {
    targetFile.write(`<object placeholders="1" c4Name="${this.sanitize(
      element.source.title
    )}" c4Type="Component" c4Technology="e.g. Spring Service" c4Description="Description of component role/responsibility." label="&lt;font style=&quot;font-size: ${
      LayoutConstants.elementFontSize
    }px&quot;&gt;&lt;b&gt;%c4Name%&lt;/b&gt;&lt;/font&gt;&lt;div&gt;[%c4Type%: %c4Technology%]&lt;/div&gt;&lt;br&gt;&lt;div&gt;&lt;font style=&quot;font-size: 11px&quot;&gt;%c4Description%&lt;/font&gt;&lt;/div&gt;" id="${
      element.source.id
    }"><mxCell style="rounded=1;whiteSpace=wrap;html=1;labelBackgroundColor=none;fillColor=#63BEF2;fontColor=#ffffff;align=center;arcSize=6;strokeColor=#2086C9;metaEdit=1;resizable=0;points=[[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];" vertex="1" parent="tpl-1">
        <mxGeometry x="${element.x}" y="${element.y}" width="${element.width}" height="${
      element.height
    }" as="geometry" />
      </mxCell>
    </object>`);
  }

  private writePerson(targetFile: fs.WriteStream, element: ElementPresentation) {
    targetFile.write(
      `<object placeholders="1" c4Name="${this.sanitize(
        element.source.title
      )}" c4Type="Person" c4Description="" label="&lt;font style=&quot;font-size: ${
        LayoutConstants.elementFontSize
      }px&quot;&gt;&lt;b&gt;%c4Name%&lt;/b&gt;&lt;/font&gt;&lt;div&gt;[%c4Type%]&lt;/div&gt;&lt;br&gt;&lt;div&gt;&lt;font style=&quot;font-size: 11px&quot;&gt;&lt;font color=&quot;#cccccc&quot;&gt;%c4Description%&lt;/font&gt;&lt;/div&gt;" id="${
        element.source.id
      }"><mxCell style="html=1;fontSize=11;dashed=0;whiteSpace=wrap;fillColor=#083F75;strokeColor=#06315C;fontColor=#ffffff;shape=mxgraph.c4.person2;align=center;resizable=1;metaEdit=1;points=[[0.5,0,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0]];resizable=0;" vertex="1" parent="tpl-1"><mxGeometry x="${
        element.x
      }" y="${element.y}" width="${element.width}" height="${element.width}" as="geometry" /></mxCell></object>`
    );
  }

  private writeContainerBoundary(): (targetFile: fs.WriteStream, group: GroupPresentation) => void {
    return (targetFile: fs.WriteStream, group: GroupPresentation) =>
      targetFile.write(
        `<object placeholders="1" c4Name="${this.sanitize(
          group.title
        )}" c4Type="ContainerScopeBoundary" c4Application="Container" label="&lt;font style=&quot;font-size: 16px&quot;&gt;&lt;b&gt;&lt;div style=&quot;text-align: left&quot;&gt;%c4Name%&lt;/div&gt;&lt;/b&gt;&lt;/font&gt;&lt;div style=&quot;text-align: left&quot;&gt;[%c4Application%]&lt;/div&gt;" id="boundary-${
          group.id
        }"><mxCell style="rounded=1;fontSize=11;whiteSpace=wrap;html=1;dashed=1;arcSize=20;fillColor=none;strokeColor=#666666;fontColor=#333333;labelBackgroundColor=none;align=left;verticalAlign=bottom;labelBorderColor=none;spacingTop=0;spacing=10;dashPattern=8 4;metaEdit=1;rotatable=0;perimeter=rectanglePerimeter;noLabel=0;labelPadding=0;allowArrows=0;connectable=0;expand=0;recursiveResize=0;editable=1;pointerEvents=0;absoluteArcSize=1;points=[[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];" vertex="1" parent="tpl-1"><mxGeometry x="${
          group.x
        }" y="${group.y}" width="${group.width}" height="${group.height}" as="geometry" /></mxCell></object>`
      );
  }

  private writeSoftwareSystemBoundary(): (targetFile: fs.WriteStream, group: GroupPresentation) => void {
    return (targetFile: fs.WriteStream, group: GroupPresentation) =>
      targetFile.write(
        `<object placeholders="1" c4Name="${this.sanitize(
          group.title
        )}" c4Type="SystemScopeBoundary" c4Application="Software System" label="&lt;font style=&quot;font-size: 16px&quot;&gt;&lt;b&gt;&lt;div style=&quot;text-align: left&quot;&gt;%c4Name%&lt;/div&gt;&lt;/b&gt;&lt;/font&gt;&lt;div style=&quot;text-align: left&quot;&gt;[%c4Application%]&lt;/div&gt;" id="boundary-${
          group.id
        }"><mxCell style="rounded=1;fontSize=11;whiteSpace=wrap;html=1;dashed=1;arcSize=20;fillColor=none;strokeColor=#666666;fontColor=#333333;labelBackgroundColor=none;align=left;verticalAlign=bottom;labelBorderColor=none;spacingTop=0;spacing=10;dashPattern=8 4;metaEdit=1;rotatable=0;perimeter=rectanglePerimeter;noLabel=0;labelPadding=0;allowArrows=0;connectable=0;expand=0;recursiveResize=0;editable=1;pointerEvents=0;absoluteArcSize=1;points=[[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];" vertex="1" parent="tpl-1"><mxGeometry x="${
          group.x
        }" y="${group.y}" width="${group.width}" height="${group.height}" as="geometry" /></mxCell></object>`
      );
  }

  private writeRelation(
    targetFile: fs.WriteStream,
    relationship: RelationshipPresentation,
    options: DrawioExporterOptions
  ) {
    const lineStartStyle = relationship.bidirectional ? 'startArrow=blockThin;startFill=1;startSize=14;' : '';

    targetFile.write(
      `<object placeholders="1" c4Type="Relationship" c4Description="${this.sanitize(
        relationship.description
      )}" label="&lt;div style=&quot;text-align: left&quot;&gt;&lt;div style=&quot;text-align: center&quot;&gt;&lt;b&gt;%c4Description%&lt;/b&gt;&lt;/div&gt;" id="${
        relationship.id
      }"><mxCell style="endArrow=blockThin;endFill=1;endSize=14;html=1;fontSize=${
        relationship.fontSize
      };fontColor=#404040;strokeWidth=3;strokeColor=#333333;metaEdit=1;${lineStartStyle}jumpStyle=arc;arcSize=1000;jumpSize=16;rounded=1;" parent="tpl-1" source="${
        relationship.sourceId
      }" target="${relationship.targetId}" edge="1"><mxGeometry width="240" relative="1" as="geometry">`
    );

    if (relationship.points.length > 0) {
      targetFile.write(`<Array as="points">`);
      relationship.points.forEach((p) => targetFile.write(`<mxPoint x="${p.x}" y="${p.y}" />`));
      targetFile.write(`</Array>`);
    }

    targetFile.write(`</mxGeometry></mxCell></object>`);
  }

  private writeGroups(targetFile: fs.WriteStream, view: ViewPresentation, options: DrawioExporterOptions) {
    view.groups.forEach((g) => {
      const formatter = options.groupFormatter[g.type];
      formatter(targetFile, g);
    });
  }

  private writeViewTitle(targetFile: fs.WriteStream, view: ViewPresentation) {
    const contentRectangle = getRectangle([...view.groups, ...view.elements]);
    const titleRectangle = <Rectangle>{
      ...contentRectangle,
      y: contentRectangle.y - LayoutConstants.viewTitleHeight,
      height: LayoutConstants.viewTitleHeight
    };

    targetFile.write(`<mxCell id="viewn-title-${view.id}" value="${view.name}" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=32;fontStyle=1;align=left" vertex="1" parent="tpl-1">
            <mxGeometry x="${titleRectangle.x}" y="${titleRectangle.y}" width="${titleRectangle.width}" height="${titleRectangle.height}" as="geometry" />
          </mxCell>`);
  }

  private getViewName(view: DiagramView): string {
    return `${view.title}`;
  }

  private sanitize(source: string) {
    return source
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/&/g, '&amp;')
      .replace(/\n/g, '&lt;br&gt;');
  }

  private getDefaultOptions(): DrawioExporterOptions {
    return {
      viewFilter: (_) => true,
      afterLayoutCompleted: (_) => {},
      beforeWriteContent: (_, __) => {},
      viewNameFormatter: this.getViewName,
      relationshipFormatter: this.defaultRelationshipFormatter,
      groupFormatter: {
        softwareSystem: this.writeSoftwareSystemBoundary(),
        container: this.writeContainerBoundary
      }
    };
  }

  private defaultRelationshipFormatter(connection: DiagramEdge, view: DiagramView): RelationshipPresentation {
    return {
      description: connection.description,
      id: connection.id,
      fontSize: LayoutConstants.relationshipFontSize,
      sourceId: connection.source,
      targetId: connection.target,
      points: [],
      bidirectional: false,
      source: connection
    };
  }

  protected getLeafElements(model: DiagramView): DiagramNode[] {
    return model.nodes.filter((x) => x.children.length == 0);
  }

  private kindToElementType(kind: string): ElementType {
    switch (kind) {
      case 'softwareSystem':
        return ElementType.softwareSystem;
      case 'externalSystem':
        return ElementType.externalSystem;
      case 'person':
        return ElementType.person;
      case 'container':
        return ElementType.container;
      case 'storage':
        return ElementType.container;
      case 'bus':
        return ElementType.container;
      case 'component':
        return ElementType.component;
    }
  }
}

export function getRectangle(content: Rectangle[]) {
  const left = Math.min(...content.map((x) => x.x)) - LayoutConstants.groupMargins.left;
  const top = Math.min(...content.map((x) => x.y)) - LayoutConstants.groupMargins.top;
  const right = Math.max(...content.map((x) => x.x + x.width)) + LayoutConstants.groupMargins.right;
  const bottom = Math.max(...content.map((x) => x.y + x.height)) + LayoutConstants.groupMargins.bottom;

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}
