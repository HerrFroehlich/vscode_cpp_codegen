import {
  WorkspaceDirectoryFinder,
  DirectoryItem,
  GoBackItem,
} from "./WorkspaceDirectories";
import { SourceFileMerger } from "./SourceFileMerger";
import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  IExtensionConfiguration,
  DirectorySelectorMode,
} from "./Configuration";
import { asyncForEach } from "./utils";

interface SerializedContent {
  mode: io.SerializableMode;
  outputUri: vscode.Uri;
  content: string;
}
class FileHandlerContext {
  constructor(public readonly edit: vscode.WorkspaceEdit) {}
  outputDirectory!: vscode.Uri; // TODO
  outputFilename: string = "";
}

export class HeaderFileHandler {
  private _context: FileHandlerContext;

  constructor(
    private readonly _headerFile: cpp.HeaderFile,
    edit: vscode.WorkspaceEdit,
    private readonly _workspaceDirectoryFinder: WorkspaceDirectoryFinder,
    private readonly _opt: IExtensionConfiguration
  ) {
    this._context = new FileHandlerContext(edit);
  }

  async writeFileAs(...modes: io.SerializableMode[]) {
    this.createClassNames(modes);
    this.selectOutputDirectory();

    //await userInput.prompt();
    // check ctx

    const outputContent = this.serializeContent(modes);
    this.writeNewContent(outputContent);

    await vscode.workspace.applyEdit(this._context.edit);
    await asyncForEach(outputContent, async (serialized) => {
      await vscode.window.showTextDocument(serialized.outputUri);
    });
  }

  private async createClassNames(modes: io.SerializableMode[]) {
    await asyncForEach(this._headerFile.namespaces, async (namespace) => {
      for (const c of namespace.classes) {
        await c.provideNames({} as io.INameInputProvider, ...modes); // TODO
      }
    });
  }

  private async selectOutputDirectory(): Promise<vscode.Uri> {
    throw new Error("Method not implemented.");
  }

  private serializeContent(modes: io.SerializableMode[]): SerializedContent[] {
    return modes.map((mode) => {
      const fileHeader = this.createFileHeader(
        mode,
        this._context.outputDirectory?.fsPath ?? "", // TODO
        this._context.outputFilename
      );
      const fileBody = this._headerFile.serialize({ mode });
      const outputUri = this.getOutputFileUri(mode);
      return { mode, outputUri, content: fileHeader + fileBody };
    });
  }
  private getOutputFileUri(mode: io.SerializableMode): vscode.Uri {
    let fileName = this._context.outputFilename;
    switch (mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.implHeader:
        fileName += "." + this._opt.outputFileExtension.forCppHeader;
        break;
      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        fileName += "." + this._opt.outputFileExtension.forCppSource;
        break;
    }
    return vscode.Uri.joinPath(this._context.outputDirectory, fileName);
  }

  private createFileHeader(
    mode: io.SerializableMode,
    outputDirectory: string,
    outputFileName: string
  ): string {
    let fileHeader: string;
    switch (mode) {
      case io.SerializableMode.implHeader:
        fileHeader = this._opt.fileHeader.forCppHeader;
        fileHeader += this.createIncludeStatements(
          outputDirectory,
          this._headerFile.getPath()
        );
        break;
      case io.SerializableMode.header:
      case io.SerializableMode.interfaceHeader:
        fileHeader = this._opt.fileHeader.forCppHeader;
        break;
      case io.SerializableMode.source:
        fileHeader = this._opt.fileHeader.forCppSource;
        fileHeader += this.createIncludeStatements(
          outputDirectory,
          this._headerFile.getPath()
        );
        break;
      case io.SerializableMode.implSource:
        fileHeader = this._opt.fileHeader.forCppSource;
        const include = path.join(
          outputDirectory,
          outputFileName + "." + this._opt.outputFileExtension.forCppHeader
        );
        fileHeader += this.createIncludeStatements(outputDirectory, include);
        break;
    }
    return fileHeader;
  }

  private createIncludeStatements(
    outputDirectory: string,
    ...fileIncludePaths: string[]
  ): string {
    let fileHeader = "";
    fileIncludePaths.forEach((include) => {
      let relFilePath = path.relative(outputDirectory, include);
      fileHeader += '#include "' + relFilePath + '"\n';
    });
    fileHeader += "\n";
    return fileHeader;
  }

  private writeNewContent(outputContent: SerializedContent[]) {
    asyncForEach(outputContent, async (serialized) => {
      let existingDocument: vscode.TextDocument | undefined;
      try {
        existingDocument = await vscode.workspace.openTextDocument(
          serialized.outputUri
        );
      } catch {
        existingDocument = undefined;
      }

      if (existingDocument) {
        this.mergeFiles(serialized);
      } else {
        this.createNewFile(serialized);
      }
    });
  }
  createNewFile(serialized: SerializedContent) {
    this._context.edit.createFile(serialized.outputUri);
    this._context.edit.insert(
      serialized.outputUri,
      new vscode.Position(0, 0),
      serialized.content
    );
  }

  private mergeFiles(serialized: SerializedContent) {
    switch (serialized.mode) {
      case io.SerializableMode.source:
        const sourceFileMerger = new SourceFileMerger(
          serialized.outputUri.fsPath, // TODO
          serialized.content
        );
        sourceFileMerger.merge(this._context.edit);
        break;

      default:
        vscode.window.showErrorMessage(
          "Merging header files is not implemented yet"
        );
        break;
    }
  }
}
