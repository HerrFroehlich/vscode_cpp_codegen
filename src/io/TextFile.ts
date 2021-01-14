
import * as path from 'path';
import {SerializableMode} from "./ISerial";
import * as cpp from "../cpp";
import * as vscode from 'vscode';
import * as fs from "fs";

class VirtualDocument {
    constructor(private readonly content: string) {
        this._contentProvider = new (class implements vscode.TextDocumentContentProvider {
            provideTextDocumentContent(uri: vscode.Uri): string {
              return content;
            }
        })();
        this._uriScheme = VirtualDocument._uriSchemeBase + ++VirtualDocument._id;
        this._registrationDisposable = vscode.workspace.registerTextDocumentContentProvider(this._uriScheme, this._contentProvider);
        this.uri = vscode.Uri.parse(this._uriScheme + ':');
    }

    private static readonly _uriSchemeBase = "code-gen-cpp-virtualDoc"; 
    private static _id: number = 0;

    readonly uri: vscode.Uri;
    private readonly _uriScheme: string; 
    private readonly _contentProvider: vscode.TextDocumentContentProvider;
    private readonly _registrationDisposable: vscode.Disposable;
}
export class TextFile
{
    private constructor(public readonly filePath:string, private readonly cppFile:cpp.IFile) {
        this.directory = path.dirname(filePath);
        this.ext = filePath.split('.').slice(-1)[0];
        this.basename = path.basename(filePath, "."+this.ext);
    }

    static createFromHeaderFile(textDocument:vscode.TextDocument) {
        const cppHeader = new cpp.HeaderFile(textDocument.getText());
        return new TextFile(textDocument.fileName, cppHeader);
    }

    writeAs (mode:SerializableMode) {
        let deductedFilename = this.deduceOutputFilename(mode);

        vscode.window.showInputBox({
            "prompt":"Output path of generated source file:",
            "value":deductedFilename
        }).then( input => {
            if (input?.length) {
                return input as string;
            } else {
                vscode.window.showWarningMessage("No path was provided!");
                throw Error("");
            }
        }).then(async (outputFilepath)=> {
            // TODO file header => Config
            if (!fs.existsSync(outputFilepath)) {
                //TODO pretify output (configurable?)
                const outputContent = this.generateFileHeader(mode, outputFilepath) + this.cppFile.serialize(mode);
                vscode.window.showTextDocument(vscode.Uri.file(outputFilepath));
                fs.writeFileSync(outputFilepath, outputContent, 'utf-8');
            }
            else {
                //TODO  await vscode.commands.executeCommand("vscode.diff", vscode.Uri.file(original), vscode.Uri.file(current));


                const outputContent = new VirtualDocument (this.generateFileHeader(mode, outputFilepath) + this.cppFile.serialize(mode));
                // let currentContent: string = fs.readFileSync(outputFilepath, "utf8");
                await vscode.commands.executeCommand("vscode.diff", vscode.Uri.file(outputFilepath), outputContent.uri);
                await vscode.window.showInformationMessage("Merged files. Accept changes?", { modal: false }, {title: "Ok" }, { title: "Cancel", isCloseAffordance: true });
                // vscode.window.showWarningMessage("Merging files is not implemented yet"); //TODO implement me
                // throw Error("");
            }

        });
    }

    private deduceOutputFilename(mode:SerializableMode):string {
        let deductedFilename = path.join(this.directory, this.basename);        
        switch (mode) {
            // TODO make file endings configurable
            case SerializableMode.header:
            case SerializableMode.interfaceHeader:
            case SerializableMode.implHeader:
                deductedFilename += ".hpp"; 
            case SerializableMode.source:
            case SerializableMode.implSource:    
                deductedFilename += ".cpp"; 
            break;
        }
        return deductedFilename;
    }

    private generateFileHeader(mode:SerializableMode, outputFilepath:string):string {
        let fileHeader = "";        
        switch (mode) {
            case SerializableMode.header:
            case SerializableMode.interfaceHeader:
            case SerializableMode.implHeader:
                break;
            case SerializableMode.source:
            case SerializableMode.implSource:    
                let relFilePath = path.relative(path.dirname(outputFilepath), this.directory);
                relFilePath = path.join(relFilePath, this.basename + "." + this.ext);
                // TODO make file header customizable (e.g licence)
                fileHeader += "#include \"" + relFilePath + "\"\n\n";
            break;
        }
        return fileHeader;
    }

    readonly directory:string;
    readonly basename:string;
    readonly ext:string;
}