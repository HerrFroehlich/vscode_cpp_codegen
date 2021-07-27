import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import { ISignaturable, ISourceFileNamespace } from "./io";
import { compact, differenceWith, intersectionWith, zipWith } from "lodash";
import { CommonFileMerger, FileMergerOptions } from "./CommonFileMerger";

interface InsertedText {
  content: string;
  where: number;
}

interface ChangedPair<T> {
  generated: T;
  existing: T;
}

interface Diff<T> {
  added: T[];
  removed: T[];
  changed: ChangedPair<T>[];
}

interface ClassScopeDiff {
  memberFunctions: Diff<cpp.IFunction>;
  classes: Diff<cpp.IClass>;
  constructors: Diff<cpp.IConstructor>;
}
interface ClassDiff {
  destructor: Diff<cpp.IFunction>;
  inheritance: Diff<string>;
  publicScope: ClassScopeDiff;
  privateScope: ClassScopeDiff;
  protectedScope: ClassScopeDiff;
}

interface NamespaceDiff {
  class: Diff<cpp.IClass>;
  function: Diff<cpp.IFunction>;
  namespace: Diff<cpp.INamespace>;
}
export class HeaderFileMerger extends CommonFileMerger {
  constructor(
    options: FileMergerOptions,
    private _filePath: string,
    private readonly _generatedHeaderFile: cpp.HeaderFile,
    private readonly _serializeOptions: io.SerializationOptions
  ) {
    super(options);
  }

  private createDiff<T extends cpp.Comparable<T>>(
    existing: T[],
    generated: T[]
  ): Diff<T> {
    const comparator = (a: T, b: T) => {
      return a.equals(b);
    };
    const added = differenceWith(generated, existing, comparator);
    const removed = differenceWith(existing, generated, comparator);
    const changed = compact(
      zipWith(generated, existing, (a, b) => {
        if (a.equals(b)) {
          return { generated: a, existing: b };
        }
      })
    );
    return { added, removed, changed };
  }

  private async createInsertedText<T extends io.ISerializable>(
    serializables: T[],
    where: number
  ) {
    return Promise.all(
      serializables.map(async (serializable) => {
        const content = await serializable.serialize(this._serializeOptions);
        return { content, where };
      })
    );
  }

  private async handleAddedRemovedAndExtractChanged<
    T extends cpp.Comparable<T> & io.ISerializable & io.TextScope
  >(
    edit: vscode.WorkspaceEdit,
    textDocument: vscode.TextDocument,
    addWhere: number,
    existing: T[],
    generated: T[]
  ): Promise<ChangedPair<T>[]> {
    const diff = this.createDiff(existing, generated);
    this.addTextScopeContent(
      edit,
      textDocument,
      ...(await this.createInsertedText(diff.added, addWhere))
    );

    this.deleteTextScope(edit, textDocument, ...diff.removed);

    return diff.changed;
  }

  async merge(edit: vscode.WorkspaceEdit) {
    const textDocument = await vscode.workspace.openTextDocument(
      this._filePath
    );

    const text = textDocument.getText();
    const existingHeaderFile = new cpp.HeaderFile(this._filePath, text);

    const changedNamespaces = await this.handleAddedRemovedAndExtractChanged(
      edit,
      textDocument,
      text.length,
      existingHeaderFile.namespaces,
      this._generatedHeaderFile.namespaces
    );

    changedNamespaces.forEach(
      this.mergeNamespace.bind(this, edit, textDocument)
    );
  }

  private async mergeNamespace(
    edit: vscode.WorkspaceEdit,
    textDocument: vscode.TextDocument,
    namespacePair: ChangedPair<cpp.INamespace>
  ) {
    const changedClasses = await this.handleAddedRemovedAndExtractChanged(
      edit,
      textDocument,
      namespacePair.existing.scopeEnd,
      namespacePair.existing.classes,
      namespacePair.generated.classes
    );

    const _ = await this.handleAddedRemovedAndExtractChanged(
      edit,
      textDocument,
      namespacePair.existing.scopeEnd,
      namespacePair.existing.functions,
      namespacePair.generated.functions
    );
    const changedSubNamespaces = await this.handleAddedRemovedAndExtractChanged(
      edit,
      textDocument,
      namespacePair.existing.scopeEnd,
      namespacePair.existing.subnamespaces,
      namespacePair.generated.subnamespaces
    );

    changedSubNamespaces.forEach(
      this.mergeNamespace.bind(this, edit, textDocument)
    );
    changedClasses.forEach(this.mergeClass.bind(this, edit, textDocument));
  }

  private async mergeClass(
    edit: vscode.WorkspaceEdit,
    textDocument: vscode.TextDocument,
    namespacePair: ChangedPair<cpp.IClass>
  ) {}
}
