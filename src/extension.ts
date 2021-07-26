// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as io from "./io";
import { FileHandler } from "./FileHandler";
import { Configuration } from "./Configuration";
import { WorkspaceDirectoryFinder } from "./WorkspaceDirectories";

export async function activate(context: vscode.ExtensionContext) {
  console.log("Activating code-gen.cpp!"); // TODO logger!
  let config = Configuration.get();
  let workspaceDirectoryFinder = new WorkspaceDirectoryFinder(config);

  context.subscriptions.push(
    Configuration.registerOnChanged(async (updatedConfig) => {
      if (
        config.outputDirectorySelector.ignoredDirectories !==
          updatedConfig.outputDirectorySelector.ignoredDirectories &&
        config.outputDirectorySelector.useGitIgnore !==
          updatedConfig.outputDirectorySelector.useGitIgnore
      ) {
        workspaceDirectoryFinder = new WorkspaceDirectoryFinder(updatedConfig);
        await workspaceDirectoryFinder.scan();
      }
      config = updatedConfig;
    })
  );

  async function createSourceFileStubs(
    textEditor: vscode.TextEditor,
    selection?: io.TextScope
  ) {
    const fileHandler = FileHandler.createFromHeaderFile(
      textEditor.document,
      workspaceDirectoryFinder,
      config
    );
    if (!fileHandler) {
      console.error("Could not create file handler");
      return;
    }
    try {
      return selection
        ? fileHandler.writeFileSelectionAs(
            selection,
            io.SerializableMode.source
          )
        : fileHandler.writeFileAs(io.SerializableMode.source);
    } catch (error) {
      vscode.window.showErrorMessage(
        "Unable to write source file: " + error.message
      );
      return;
    }
  }

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppSourceFromHeader",
      async (textEditor, edit) => {
        createSourceFileStubs(textEditor);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppSourceFromHeaderSelection",
      async (textEditor, edit) => {
        const fileHandler = FileHandler.createFromHeaderFile(
          textEditor.document,
          workspaceDirectoryFinder,
          config
        );

        const selectionStart = textEditor.document.offsetAt(
          textEditor.selection.anchor
        );
        const selectionEnd = textEditor.document.offsetAt(
          textEditor.selection.end
        );
        const selection = new io.TextScope(selectionStart, selectionEnd);

        createSourceFileStubs(textEditor, selection);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppInterfaceImplFromHeader",
      async (textEditor, edit) => {
        const fileHandler = FileHandler.createFromHeaderFile(
          textEditor.document,
          workspaceDirectoryFinder,
          {
            askForInterfaceImplementationNames: true,
            ...config,
          }
        );
        if (!fileHandler) {
          console.error("Could not create file handler");
          return;
        }

        try {
          await fileHandler.writeFileAs(
            io.SerializableMode.implHeader,
            io.SerializableMode.implSource
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            "Unable to create implementation source/header file: " +
              error.message
          );
          return;
        }
      }
    )
  );

  await workspaceDirectoryFinder.scan();
}

// this method is called when your extension is deactivated
export function deactivate() {}
