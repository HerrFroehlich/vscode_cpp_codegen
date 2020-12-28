import * as cpptypes from "./cpptypes";
import * as io from "./io";

// TODO Error handling: do try catch in parser or move it to a higher level (prefered so we can catch errors in deserialze functions)?

function joinStringsWithFiller(strings:string[], filler:string):string {
    let joinedStrings = '';
    for (let index = 0; index < strings.length-1; index++) {
        joinedStrings += strings[index] + filler;
    }

    return joinedStrings + strings[strings.length-1];
}

function joinStringsWithWhiteSpace(strings:string[]):string {
    return joinStringsWithFiller(strings, "\\s*");
}
class NamespaceMatch {
    constructor(rawMatch:RegExpExecArray) {
        if (rawMatch.length !== NamespaceMatch.NOF_GROUPMATCHES+1) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (rawMatch[1] === undefined) {
            throw new Error("ParserError: No namespace name, this should not happen!");               
        }

        this.nameMatch = rawMatch[1];

        this.contentMatch = (rawMatch[2]) ? rawMatch[2] : "";
    }

    private static readonly namespaceSpecifierRegex: string = "namespace\\s";
    private static readonly namespaceNameRegex: string = "([\\S]+)";
    private static readonly namespaceBodyRegex: string = "{([\\s\\S]*)}";
    private static readonly nextNamespaceRegex: string = "(?=namespace)";
    
    static readonly SINGLE_REGEX_STR: string = joinStringsWithWhiteSpace(
        [NamespaceMatch.namespaceSpecifierRegex, NamespaceMatch.namespaceNameRegex, NamespaceMatch.namespaceBodyRegex]);
    static readonly MULTI_REGEX_STR: string = joinStringsWithFiller(
        [NamespaceMatch.SINGLE_REGEX_STR, NamespaceMatch.nextNamespaceRegex], "[\\s\\S]*?");
    static readonly NOF_GROUPMATCHES = 2;

    static readonly REGEX_STR:string = 'namespace (\\S*)\\s*{([\\s\\S]*namespace \\S*\\s*{[\\s\\S]*})*((?:(?!namespace)[\\s\\S])*)}';
    readonly nameMatch:string;
    readonly contentMatch:string;
}

class StandaloneFunctionMatch {
    constructor(rawMatch:RegExpExecArray) {
        if (rawMatch.length !== StandaloneFunctionMatch.NOF_GROUPMATCHES+1) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (rawMatch[1] === undefined) {
            throw new Error("ParserError: No function return type, this should not happen!");               
        }

        else if (rawMatch[2] === undefined) {
            throw new Error("ParserError: No function name, this should not happen!");               
        }

        this.returnValMatch = rawMatch[1];
        this.nameMatch = rawMatch[2];

        this.argsMatch = (rawMatch[3]) ? rawMatch[3] : "";
    }

    static readonly REGEX_STR:string = '((?:const )?\\S*)\\s*(\\S*)\\s*\\(([\\s\\S]*?)\\)\\s*;';
    static readonly NOF_GROUPMATCHES = 3;

    readonly returnValMatch:string;
    readonly nameMatch:string;
    readonly argsMatch:string;
}

class ClassMatch {
    constructor(rawMatch:RegExpExecArray) {
        if (rawMatch.length !== ClassMatch.NOF_GROUPMATCHES+1) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (rawMatch[1] === undefined) {
            throw new Error("ParserError: No class name, this should not happen!");               
        }

        this.nameMatch = rawMatch[1];
        this.inheritanceMatch = (rawMatch[2]) ? rawMatch[2].split(",") : [];
        this.bodyMatch = (rawMatch[3]) ? rawMatch[3] : "";
        this.isInterface = ClassMatch.pureVirtualMemberRegexMatcher.test(this.bodyMatch);
    }

    private static readonly classSpecifierRegex: string = "class\\s";
    private static readonly classNameRegex: string = "([\\S]+)";
    private static readonly inheritanceRegex: string = "(?::\\s*([\\S\\s]+))?";
    private static readonly noNestedClassRegex: string = "(?!"+ClassMatch.classSpecifierRegex+"\\s*[\\S]+\\s*{)";
    private static readonly classBodyRegex: string = "{((?:"+ClassMatch.noNestedClassRegex+"[\\s\\S])*)}";
    private static readonly classEndRegex: string = ";";
    private static readonly pureVirtualMemberRegexMatcher =  /virtual[\s\S]*?=[\s]*0[\s]*;/g;
    
    static readonly REGEX_STR: string = joinStringsWithWhiteSpace(
        [ClassMatch.classSpecifierRegex, ClassMatch.classNameRegex, ClassMatch.inheritanceRegex,
         ClassMatch.classBodyRegex, ClassMatch.classEndRegex]);
    static readonly NOF_GROUPMATCHES = 3;

    readonly nameMatch:string;
    readonly inheritanceMatch: string[];
    readonly bodyMatch: string;
    readonly isInterface: boolean;
}
class ClassProtectedScopeMatch {

    constructor(rawMatch:RegExpExecArray) {
        if (rawMatch.length !== ClassProtectedScopeMatch.NOF_GROUPMATCHES+1) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }

        this.scopeContent = (rawMatch[1]) ? rawMatch[1] : "";
    }

    static readonly REGEX_STR:string = "protected:((?:(?!private:)(?!public:)[\\s\\S])*)";
    static readonly NOF_GROUPMATCHES = 1;

    readonly scopeContent:string;
}
class ClassPublicScopeMatch {

    constructor(rawMatch:RegExpExecArray) {
        if (rawMatch.length !== ClassPublicScopeMatch.NOF_GROUPMATCHES+1) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }

        this.scopeContent = (rawMatch[1]) ? rawMatch[1] : "";
    }

    static readonly REGEX_STR:string = "public:((?:(?!private:)(?!protected:)[\\s\\S])*)";
    static readonly NOF_GROUPMATCHES = 1;

    readonly scopeContent:string;
}

class MemberFunctionMatch {
    constructor(rawMatch:RegExpExecArray) {
        if (rawMatch.length !== MemberFunctionMatch.NOF_GROUPMATCHES+1) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (rawMatch[1] === undefined) {
            throw new Error("ParserError: No function name, this should not happen!");               
        }

        let virtualMatcher = new RegExp (MemberFunctionMatch.virtualSubMatchRegex);
        let match = virtualMatcher.exec(rawMatch[1]);
        if (!match || !match[2]) {
            throw new Error("ParserError: No function return type, this should not happen!");               
        }
        this.virtualMatch = (match[1]) ? true : false;
        this.returnValMatch = match[2];

        this.nameMatch = rawMatch[2];
        this.argsMatch = (rawMatch[3]) ? rawMatch[3] : "";
        this.constMatch = (rawMatch[4]) ? true : false;

        this.virtualMatch = (this.virtualMatch) || ((rawMatch[5]) ? true : false);
        this.pureMatch = (rawMatch[6]) ? true : false;
        if (!this.virtualMatch && this.pureMatch) {
           throw new Error("ParserError: Invalid specifier combination: '=0' missing virtual for function: " + this.nameMatch);
           return;
        }

    }

    private static readonly mayHaveVirtualRegex:string = '(virtual)?';
    private static readonly returnValRegex:string = '(\\S+[\\s\\S]*?)';
    private static readonly funcNameRegex:string = '(\\S+)';
    private static readonly funcArgsRegex:string = '\\(([\\s\\S]*?)\\)';
    private static readonly mayHaveConstSpecifierRegex:string = '(const)?';
    private static readonly mayHaveOverrideRegex:string = '(override)?';
    private static readonly mayBePure:string = '(=\\s*0)?';
    private static readonly virtualSubMatchRegex:string = joinStringsWithWhiteSpace([MemberFunctionMatch.mayHaveVirtualRegex, MemberFunctionMatch.returnValRegex + '$']);
    static readonly REGEX_STR:string = joinStringsWithWhiteSpace([MemberFunctionMatch.returnValRegex+'\\s', MemberFunctionMatch.funcNameRegex,
         MemberFunctionMatch.funcArgsRegex, MemberFunctionMatch.mayHaveConstSpecifierRegex, MemberFunctionMatch.mayHaveOverrideRegex, MemberFunctionMatch.mayBePure, ';']);
    static readonly NOF_GROUPMATCHES = 6;

    readonly virtualMatch:boolean;
    readonly returnValMatch:string;
    readonly nameMatch:string;
    readonly argsMatch:string;
    readonly constMatch:boolean;
    readonly pureMatch:boolean;
}



export abstract class Parser {

    //TODO parse memberfunctions as one function and pass output arrays as arguments?
    static parseClassPrivateScope(data:io.TextFragment): io.TextFragment {
        let publicOrPrivateRegexMatcher:RegExp = /(?:public:|protected:)((?!private:)[\s\S])*/g;
        // let privateScope = data.remainingContent.replace(publicOrPrivateRegexMatcher, "");
        let privateScope = "bla";
        return new io.TextFragment(privateScope);
    }

    static parseClassPublicScope(data:io.TextFragment): io.TextFragment {
        let publicScope = "";
        data.matchAndRemove(ClassPublicScopeMatch.REGEX_STR,
            (rawMatch) => {
                let match = new ClassPublicScopeMatch(rawMatch);
                publicScope += match.scopeContent;
            }
            );

        return new io.TextFragment(publicScope);
    }

    static parseClassProtectedScope(data:io.TextFragment): io.TextFragment {
        let protectedScope = "";
        data.matchAndRemove(ClassProtectedScopeMatch.REGEX_STR,
            (rawMatch) => {
                let match = new ClassProtectedScopeMatch(rawMatch);
                protectedScope += match.scopeContent;
            }
            );

        return new io.TextFragment(protectedScope);
    }

    static parseClassMemberFunctions(data: io.TextFragment, classNameGen:io.ClassNameGenerator): cpptypes.IFunction[] {
        let memberFunctions:cpptypes.IFunction[] = [];
        data.matchAndRemove(MemberFunctionMatch.REGEX_STR,
            (rawMatch) => {
                let match = new MemberFunctionMatch(rawMatch);        

                let newFunc:cpptypes.IFunction;
                if (match.virtualMatch) {
                    if (match.pureMatch) {
                        newFunc = new cpptypes.PureVirtualMemberFunction(match.nameMatch, match.returnValMatch,
                             match.argsMatch, match.constMatch, classNameGen);
                    }
                    else {
                        newFunc = new cpptypes.VirtualMemberFunction(match.nameMatch, match.returnValMatch,
                             match.argsMatch, match.constMatch, classNameGen);
                    }
                }
                else {
                    newFunc = new cpptypes.MemberFunction(match.nameMatch, match.returnValMatch,
                        match.argsMatch, match.constMatch, classNameGen);
                }

                memberFunctions.push(newFunc);
            }
            );

        return memberFunctions;
    }

    static parseNamespaces(data:io.TextFragment): cpptypes.INamespace[]  {
        let namespaces:cpptypes.INamespace[] = [];

        let generateNewNamespace = (rawMatch: RegExpExecArray) => {
            let match = new NamespaceMatch(rawMatch);
            let newNamespace = new cpptypes.Namespace(match.nameMatch);
            let newData = new io.TextFragment(match.contentMatch);
            newNamespace.deserialize(newData);
            return newNamespace;
        };

        data.matchAndRemove(
            NamespaceMatch.MULTI_REGEX_STR,
        
            (rawMatch) => {
                namespaces.push(generateNewNamespace(rawMatch));
            }
        );
        data.matchAndRemove(
            NamespaceMatch.SINGLE_REGEX_STR,
        
            (rawMatch) => {
                namespaces.push(generateNewNamespace(rawMatch))
            }
        );

        return namespaces;
    }

    static parseStandaloneFunctiones(data:io.TextFragment): cpptypes.IFunction[] {
        let standaloneFunctions:cpptypes.IFunction[] = [];

        data.matchAndRemove(
            StandaloneFunctionMatch.REGEX_STR,
        
            (rawMatch) => {
                let match = new StandaloneFunctionMatch(rawMatch);
                standaloneFunctions.push(new cpptypes.StandaloneFunction(match.nameMatch, 
                    match.returnValMatch, 
                    match.argsMatch));
            }
        );

        return standaloneFunctions;
    }
    
    static parseClasses(data:io.TextFragment):cpptypes.IClass[] {
        let classes: cpptypes.IClass[] = [];
        
        let generateNewClass = (rawMatch: RegExpExecArray) => {
            let match = new ClassMatch(rawMatch);
            let newClass = match.isInterface? new cpptypes.ClassInterface(match.nameMatch, match.inheritanceMatch) : new cpptypes.ClassImpl(match.nameMatch, match.inheritanceMatch);
            let newData = new io.TextFragment(match.bodyMatch);
            newClass.deserialize(newData);
            return newClass;
        };

        data.matchAndRemove(
            ClassMatch.REGEX_STR,
        
            (rawMatch) => {
                classes.push(generateNewClass(rawMatch)); 
            }
        );
        return classes;
    }
}