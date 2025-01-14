import * as path from 'path';
import * as vscode from 'vscode';
import { FileFormat } from './renderer';
import { IHtmlContentService } from './htmlcontentservice';

export class PreviewManager {
  private readonly previews = new WeakMap<vscode.TextDocument, vscode.WebviewPanel>();

  constructor(private htmlContentService: IHtmlContentService) {
    //this.context = context;
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

   public async updatePreviewFor(textDocument: vscode.TextDocument): Promise<void> {
    /* do we have a preview for that document? */
    let preview = this.previews.get(textDocument);
    if (preview) {
      await this.updatePreviewContent(textDocument, preview);
    }
  }

  private async updatePreviewContent(textDocument: vscode.TextDocument, preview: vscode.WebviewPanel): Promise<void> {
    let fileFormat = preview.viewType as FileFormat;
    let baseFolder = path.dirname(textDocument.fileName);
    preview.webview.html = await this.htmlContentService.getPreviewHtml(fileFormat, textDocument, baseFolder);
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
        retainContextWhenHidden: true,
        //localResourceRoots: [
          //vscode.Uri.file(path.join(this.context.extensionPath, 'resources'))
      //]
      }
    );

    /* fill the preview */
    this.updatePreviewContent(textDocument, preview);

    /* wire up the event handlers */
    preview.onDidDispose(() => this.previews.delete(textDocument));

    preview.webview.onDidReceiveMessage(message => {
//      switch (message.command) {
  //        case 'alert':
              vscode.window.showErrorMessage(JSON.stringify(message));
        //      return;
    //  }
  }, undefined);//), context.subscriptions);
  //preview.webview.onDidReceiveMessage() {
    return preview;
  }
}