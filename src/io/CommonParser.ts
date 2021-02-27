import * as io from ".";

export function joinStringsWithFiller(strings:string[], filler:string):string {
    let joinedStrings = '';
    for (let index = 0; index < strings.length-1; index++) {
        joinedStrings += strings[index] + filler;
    }

    return joinedStrings + strings[strings.length-1];
}

export function joinStringsWithWhiteSpace(...strings:string[]):string {
    return joinStringsWithFiller(strings, "\\s*");
}

export class NamespaceMatch {
    constructor(regexMatch:io.TextMatch) {

        this.nameMatch = regexMatch.getGroupMatch(0) as string;

        this.bodyMatch = regexMatch.getGroupMatchFragment(1) as io.TextFragment;
    }

    private static readonly namespaceSpecifierRegex: string = "namespace\\s";
    private static readonly namespaceNameRegex: string = "([\\S]+)";
    private static readonly noNestedNamespaceRegex: string = "(?!"+NamespaceMatch.namespaceSpecifierRegex+"\\s*[\\S]+\\s*{)";
    private static readonly namespaceBodyRegex: string = "{((?:"+NamespaceMatch.noNestedNamespaceRegex+"[\\s\\S])*?)}(?![\\s]*;)";
    
    static readonly regexStr: string = joinStringsWithWhiteSpace(
        NamespaceMatch.namespaceSpecifierRegex, NamespaceMatch.namespaceNameRegex, NamespaceMatch.namespaceBodyRegex);

    readonly nameMatch:string;
    readonly bodyMatch:io.TextFragment;
}

class CommentMatch {
    static readonly regexStr:string = "(\\/\\*[\\s\\S]*?\\*\\/)|(\\/\\/.*)";
}

export abstract class CommonParser {
    static parseComments(data:io.TextFragment): void {
        new io.RemovingRegexMatcher(CommentMatch.regexStr).match(data);
    }
}