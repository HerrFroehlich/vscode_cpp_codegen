import * as io from ".";
import { NamespaceMatch, CommonParser } from "./CommonParser";

export abstract class SourceParser extends CommonParser {
    getSignatures(data:io.TextFragment): io.ISignaturable[] {
        
    }    
}