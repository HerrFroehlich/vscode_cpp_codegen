import * as vscode from "vscode";

function getConfigArray<T>(section: string): T[] {
  const config = vscode.workspace.getConfiguration();
  return config.get(section) ?? [];
}

function getConfigString(section: string): string {
  const config = vscode.workspace.getConfiguration();
  return config.get(section) ?? "";
}

function getConfigBool(section: string): boolean {
  const config = vscode.workspace.getConfiguration();
  return config.get(section) ?? false;
}

interface IFileHeaderSection {
  forCppSource: string;
  forCppHeader: string;
}
interface IOutputFileExtensionSection {
  forCppSource: string;
  forCppHeader: string;
}
interface IOutputDirectorySelectorSection {
  mode: DirectorySelectorMode;
  ignoredDirectories: string[];
  useGitIgnore: boolean;
}

function getOutputDirectorySelectorMode(): DirectorySelectorMode {
  switch (getConfigString("codegen-cpp.OutputDirectorySelector.Mode")) {
    case DirectorySelectorMode.quickPick:
      return DirectorySelectorMode.quickPick;
    case DirectorySelectorMode.ui:
      return DirectorySelectorMode.ui;

    case DirectorySelectorMode.disabled:
    default:
      return DirectorySelectorMode.disabled;
  }
}

function getSourceFileNamespaceSerialization() {
  switch (getConfigString("codegen-cpp.SourceFileNamespace.Serialization")) {
    case SourceFileNamespaceSerialization.prepended:
      return SourceFileNamespaceSerialization.prepended;
    case SourceFileNamespaceSerialization.named:
    default:
      return SourceFileNamespaceSerialization.named;
  }
}

export enum DirectorySelectorMode {
  disabled = "Disabled",
  quickPick = "QuickPick",
  ui = "UI",
}

export enum SourceFileNamespaceSerialization {
  named = "Named",
  prepended = "Prepended",
}
export interface IExtensionConfiguration {
  fileHeader: IFileHeaderSection;
  outputFileExtension: IOutputFileExtensionSection;
  outputDirectorySelector: IOutputDirectorySelectorSection;
  deduceOutputFileNames: boolean;
  sourceFileNamespaceSerialization: SourceFileNamespaceSerialization;
}

export class Configuration {
  static get(): IExtensionConfiguration {
    if (!this._config) {
      this._config = this.read();
    }

    return this._config;
  }

  static registerOnChanged(
    callback: (updatedConfig: IExtensionConfiguration) => void | Promise<void>
  ): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration("codegen-cpp")) {
        this._config = this.read();
        await callback(this._config);
      }
    });
  }
  private static read(): IExtensionConfiguration {
    const fileHeader: IFileHeaderSection = {
      forCppSource:
        getConfigArray("codegen-cpp.FileHeader.ForC++Source").join("\n") + "\n",
      forCppHeader:
        getConfigArray("codegen-cpp.FileHeader.ForC++Header").join("\n") + "\n",
    };

    const outputFileExtension: IOutputFileExtensionSection = {
      forCppSource: getConfigString(
        "codegen-cpp.OutputFileExtension.ForC++Source"
      ),
      forCppHeader: getConfigString(
        "codegen-cpp.OutputFileExtension.ForC++Header"
      ),
    };

    const outputDirectorySelector: IOutputDirectorySelectorSection = {
      mode: getOutputDirectorySelectorMode(),
      ignoredDirectories: getConfigArray(
        "codegen-cpp.OutputDirectorySelector.IgnoredDirectories"
      ),
      useGitIgnore: getConfigBool(
        "codegen-cpp.OutputDirectorySelector.UseGitIgnore"
      ),
    };

    const sourceFileNamespaceSerialization = getSourceFileNamespaceSerialization();

    return {
      fileHeader,
      outputFileExtension,
      outputDirectorySelector,
      deduceOutputFileNames: getConfigBool("codegen-cpp.deduceOutputFileNames"),
      sourceFileNamespaceSerialization,
    };
  }

  private static _config: IExtensionConfiguration | undefined;
}
