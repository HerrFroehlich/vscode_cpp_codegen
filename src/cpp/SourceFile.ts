

import { INamespace} from "./TypeInterfaces";
import {FileBase} from './FileBase';
import * as io from '../io';

export class SourceFile extends FileBase implements io.IFile
{
    constructor(filePath:string, content: string)
    {
        super(filePath);
        this._namespaces = [];
        this.deserialize(io.TextFragment.createFromString(content));
    }

    deserialize (fileContent: io.TextFragment)
    {
        //TODO
    }

    serialize (mode: io.SerializableMode)
    {
        return io.serializeArray(this._namespaces, mode);
    }

    static generateFileHeader(outputFilePath: string, ...fileIncludePaths: string[]):string {
        let fileHeader = io.Configuration.getFileHeaderForCppSource();
        fileHeader += super.createIncludeStatements(outputFilePath, ...fileIncludePaths);
        return fileHeader; 
    }

    static readonly extensions = ["cpp","cxx", "c"]; // TODO make extensions configurable
    private readonly _namespaces: INamespace[];
} 