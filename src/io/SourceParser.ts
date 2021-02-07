import { TextScope, TextFragment, TextRegexMatch } from "./Text";
import { ISignaturable } from "./ISignaturable";
import { NamespaceMatch, CommonParser, joinStringsWithWhiteSpace } from "./CommonParser";
import { sign } from "crypto";
class FunctionDefinitionMatch {
    constructor(regexMatch:TextRegexMatch) {
        if (regexMatch.groupMatches.length !== FunctionDefinitionMatch.nofGroupMatches) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }

        this.returnValMatch = regexMatch.groupMatches[0];
        this.nameMatch = regexMatch.groupMatches[1];
        this.argsMatch = regexMatch.groupMatches[2];
        this.constMatch = regexMatch.groupMatches[3] ? regexMatch.groupMatches[3] : "";
    }

    private static readonly returnValRegex:string = '(\\b.+?)\\s';
    private static readonly funcNameRegex:string = '(\\S+)';
    private static readonly funcArgsRegex:string = '\\(((?:(?!\\()[\\s\\S])*?)\\)';
    private static readonly mayHaveConstSpecifierRegex:string = '(const)?';
    private static readonly funcBodyRegex:string = '{[\\s\\S]*?}';
    static readonly regexStr:string = joinStringsWithWhiteSpace(FunctionDefinitionMatch.returnValRegex, FunctionDefinitionMatch.funcNameRegex,
         FunctionDefinitionMatch.funcArgsRegex, FunctionDefinitionMatch.mayHaveConstSpecifierRegex, FunctionDefinitionMatch.funcBodyRegex);
    static readonly nofGroupMatches = 4;

    readonly returnValMatch:string;
    readonly nameMatch:string;
    readonly argsMatch:string;
    readonly constMatch:string;
}

class SourceFileNamespace extends TextScope {
    constructor(public name:string, scope: TextScope) {
        super(scope.scopeStart, scope.scopeEnd);
    };

    // getSignatures(): ISignaturable[] {
    //     const signatures = this.signatures; 
    //     const nsSignatures =  ([] as ISignaturable[]).concat(...this.subnamespaces.map(ns => ns.getSignatures()));    
    //     nsSignatures.forEach(signature => signature.namespaces.unshift(this.name));
    //     signatures.push(...nsSignatures);
    //     return signatures;
    // }

    tryAddNameToSignature(signature:ISignaturable): boolean {
        if (!this.fullyContains(signature.textScope)) {
            return false;
        } {
            this.subnamespaces.every(subnamespace => !subnamespace.tryAddNameToSignature(signature));
            signature.namespaces.unshift(this.name);
        }
        return true;
    }

    subnamespaces: SourceFileNamespace[] = [];
}
export abstract class SourceParser extends CommonParser {
    static parseSignatures(data:TextFragment): ISignaturable[] {
        const signatures:ISignaturable[] = SourceParser.parseSignaturesWithinNamespace(data);
    
        const namespaces = this.parseNamespaces(data);
        signatures.forEach(signature => 
            namespaces.every(namespace => namespace.tryAddNameToSignature(signature)));

        return signatures;
    }    

    private static parseSignaturesWithinNamespace(data:TextFragment): ISignaturable[] {
        const signatures:ISignaturable[] = [];
        data.removeMatching(FunctionDefinitionMatch.regexStr).forEach(
            (regexMatch) => {           
                const match = new FunctionDefinitionMatch(regexMatch);
                const funcDefinition:ISignaturable = {
                    namespaces: [] as string[],
                    signature: "",
                    textScope: regexMatch as TextScope

                };
                const splittedName = match.nameMatch.split("::");
                funcDefinition.signature = splittedName[splittedName.length-1];
                funcDefinition.signature += "(" + match.argsMatch.replace(/\s/g,'') +")" + match.constMatch;
                funcDefinition.namespaces = splittedName.slice(0, splittedName.length-1);
                signatures.push (funcDefinition);
            }
        );
        return signatures;
    }
    private static parseNamespaces(data:TextFragment): SourceFileNamespace[]  {
        let namespaces:SourceFileNamespace[] = [];

        let matchesFound = true;
        while (matchesFound) {
            let newNamespaces: SourceFileNamespace[] = [];
            matchesFound = false;
            data.removeMatching(NamespaceMatch.regexStr).forEach(
                (regexMatch) => {           
                    const match = new NamespaceMatch(regexMatch);
                    newNamespaces.push(new SourceFileNamespace(match.nameMatch, regexMatch as TextScope)); 
                    matchesFound = true;
                }
            );
            
            if (matchesFound) {
                newNamespaces.forEach(
                    (newNamespace) => {
                        namespaces.every ((possibleNestedNamespace, index) => 
                            {
                                if (newNamespace.fullyContains(possibleNestedNamespace)) {
                                    newNamespace.subnamespaces.push(possibleNestedNamespace);
                                    namespaces.splice(index,1);
                                    return false;
                                }
                                return true;
                            });
                        namespaces.push(newNamespace);
                    }
                );
            }
        }

        return namespaces;
    }    
    
}