import * as path from 'path';
import * as vscode from 'vscode';
import { FileFormat } from './renderer';
import { IHtmlContentService } from './htmlcontentservice';

export class PreviewManager {
  private readonly previews = new WeakMap<vscode.TextDocument, vscode.WebviewPanel>();

  constructor(private htmlContentService: IHtmlContentService) {
  }

  private getColumn(activeColumn?: vscode.ViewColumn): vscode.ViewColumn {
    var ret: vscode.ViewColumn;
    if (activeColumn === vscode.ViewColumn.One) {
      ret = vscode.ViewColumn.Two;
    } else {
      ret = vscode.ViewColumn.Three;
    }
    return ret;
  }

  public async showPreviewFor(textEditor: vscode.TextEditor, viewType: FileFormat) {
    let preview = this.previews.get(textEditor.document);
    if (!preview) {
      preview = await this.createPreview(textEditor.document, this.getColumn(textEditor.viewColumn), viewType);
      this.previews.set(textEditor.document, preview);
    } else {
      preview.reveal(textEditor.viewColumn || this.getColumn(textEditor.viewColumn), true);
    }
  }

  public updatePreviewFor(textDocument: vscode.TextDocument) {
    /* do we have a preview for that document? */
    let preview = this.previews.get(textDocument);
    if (preview) {
      this.updatePreviewContent(textDocument, preview);
    }
  }

  private async updatePreviewContent(textDocument: vscode.TextDocument, preview: vscode.WebviewPanel) {
    let content = textDocument.getText();
    let fileFormat = preview.viewType as FileFormat;
    let baseFolder = path.dirname(textDocument.fileName);
    preview.webview.html = await this.htmlContentService.getPreviewHtml(fileFormat, content, baseFolder);
  }

  private getPreviewTitle(document: vscode.TextDocument, fileFormat: FileFormat): string {
    let previewType: string;
    switch (fileFormat) {
      case "vega-lite": previewType = "Vega-Lite Preview"; break;
      case "vega": previewType = "Vega Preview"; break;
      default: previewType =""; break;
    }
    return `${previewType} for '${document.fileName}'`;
  }

  private async createPreview(textDocument: vscode.TextDocument, viewColumn: vscode.ViewColumn, viewType: FileFormat) : Promise<vscode.WebviewPanel> {
    /* create the preview */
    const preview = vscode.window.createWebviewPanel(
      viewType,
      this.getPreviewTitle(textDocument, viewType),
      {
        viewColumn: viewColumn,
        preserveFocus: true
      },
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    /* fill the preview */
    this.updatePreviewContent(textDocument, preview);

    /* wire up the event handlers */
    preview.onDidDispose(() => this.previews.delete(textDocument));

    return preview;
  }
}