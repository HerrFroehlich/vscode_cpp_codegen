import * as cpptypes from "./cpptypes";


class NamespaceMatch {
    constructor(regexMatchArr:RegExpExecArray) {
        if (regexMatchArr.length-1 !== NamespaceMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatchArr[1] === undefined) {
            throw new Error("ParserError: No namespace name, this should not happen!");               
        }

        this.nameMatch = regexMatchArr[1];

        this.namespaceMatch = (regexMatchArr[2]) ? regexMatchArr[2] : "";
        this.contentMatch = (regexMatchArr[3]) ? regexMatchArr[3] : "";
    }

    // static readonly REGEX_STR:string = 'namespace ([^\\s]*)\\s*{([\\s\\S]*namespace [^\\s]*\\s*{[\\s\\S]*})*((?!namespace)[\\s\\S]*)}';
    static readonly REGEX_STR:string = 'namespace (\\S*)\\s*{([\\s\\S]*namespace \\S*\\s*{[\\s\\S]*})*((?:(?!namespace)[\\s\\S])*)}';
    static readonly NOF_GROUPMATCHES = 3;
    readonly nameMatch:string;
    readonly namespaceMatch:string;
    readonly contentMatch:string;
}

class StandaloneFunctionMatch {
    constructor(regexMatchArr:RegExpExecArray) {
        if (regexMatchArr.length-1 !== StandaloneFunctionMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatchArr[1] === undefined) {
            throw new Error("ParserError: No function return type, this should not happen!");               
        }

        else if (regexMatchArr[2] === undefined) {
            throw new Error("ParserError: No function name, this should not happen!");               
        }

        this.returnValMatch = regexMatchArr[1];
        this.nameMatch = regexMatchArr[2];

        this.argsMatch = (regexMatchArr[3]) ? regexMatchArr[3] : "";
    }

    static readonly REGEX_STR:string = '((?:const )?\\S*)\\s*(\\S*)\\s*\\(([\\s\\S]*?)\\)\\s*;';
    static readonly NOF_GROUPMATCHES = 3;

    readonly returnValMatch:string;
    readonly nameMatch:string;
    readonly argsMatch:string;
}

class ClassMatch {
    constructor(regexMatchArr:RegExpExecArray) {
        if (regexMatchArr.length-1 !== ClassMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatchArr[1] === undefined) {
            throw new Error("ParserError: No function return type, this should not happen!");               
        }

        else if (regexMatchArr[2] === undefined) {
            throw new Error("ParserError: No function name, this should not happen!");               
        }

        this.nameMatch = regexMatchArr[1];

        this.bodyMatch = (regexMatchArr[2]) ? regexMatchArr[2] : "";
    }

    // TODO: Inheritance
    private static readonly classBeginRegex:string = 'class\\s+([\\S]+)\\s*{';
    private static readonly classNonNestedBodyRegex:string = '((?!class\\s+[\\S]+\\s*{)[\\s\\S]*?)}\\s*;';
    static readonly REGEX_STR:string = ClassMatch.classBeginRegex + ClassMatch.classNonNestedBodyRegex;
    static readonly NOF_GROUPMATCHES = 2;

    readonly nameMatch:string;
    readonly bodyMatch:string;
}

class ClassPublicScopeMatch {

    constructor(regexMatchArr:RegExpExecArray) {
        if (regexMatchArr.length-1 !== ClassPublicScopeMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }

        this.scopeContent = (regexMatchArr[1]) ? regexMatchArr[1] : "";
    }

    static readonly REGEX_STR:string = "public:((?!private:|protected)[\\s\\S])*";
    static readonly NOF_GROUPMATCHES = 1;

    readonly scopeContent:string;
}

class MemberFunctionMatch {
    constructor(regexMatchArr:RegExpExecArray) {
        if (regexMatchArr.length-1 !== MemberFunctionMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatchArr[1] === undefined) {
            throw new Error("ParserError: No function return type, this should not happen!");               
        }

        else if (regexMatchArr[2] === undefined) {
            throw new Error("ParserError: No function name, this should not happen!");               
        }

        this.virtualMatch = (regexMatchArr[1]) ? true : false;
        this.returnValMatch = regexMatchArr[2];
        this.nameMatch = regexMatchArr[3];

        this.argsMatch = (regexMatchArr[4]) ? regexMatchArr[4] : "";

        this.constMatch = (regexMatchArr[5]) ? true : false;
        this.pureMatch = (regexMatchArr[6]) ? true : false;

    }

    static readonly REGEX_STR:string = '(virtual)?\\s*((?:const\\s+)?\\S+)\\s+(\\S+)\\s*\\(([\\s\\S]*?)\\)\\s*(const)?\\s*(=0)?\\s*;';
    static readonly NOF_GROUPMATCHES = 6;

    readonly virtualMatch:boolean;
    readonly returnValMatch:string;
    readonly nameMatch:string;
    readonly argsMatch:string;
    readonly constMatch:boolean;
    readonly pureMatch:boolean;
}



export abstract class Parser {

    static parseClassPrivateScope(content:string ): string {
        let publicOrPrivateRegexMatcher:RegExp = /(?:public:|protected:)((?!private:)[\s\S])*/g;
        let privateScope = content.replace(publicOrPrivateRegexMatcher, "");
        return privateScope;
    }

    static parseClassPublicScope(content:string ): string {
        let publicScope = "";
        Parser.findAllRegexMatches(ClassPublicScopeMatch.REGEX_STR, content,
            (rawMatch) => {
                let match = new ClassPublicScopeMatch(rawMatch);
                publicScope += match.scopeContent;
            }
            );


        return publicScope;
    }

    static parseClassMemberFunctions(content: string): cpptypes.IFunction[] {
        let memberFunctions:cpptypes.IFunction[] = [];
        Parser.findAllRegexMatches(MemberFunctionMatch.REGEX_STR, content,
            (rawMatch) => {
                let match = new MemberFunctionMatch(rawMatch);              
                try {  
                    let newFunc = new cpptypes.MemberFunction(match.nameMatch, match.returnValMatch, match.argsMatch, 
                        match.constMatch, match.virtualMatch, match.pureMatch);
                    memberFunctions.push(newFunc);
                } catch (error) {
                    console.log(error, "Failed to create member function, skipping!");
                }
            }
            );

        return memberFunctions;
    }

    static parseNamespaces(content:string): cpptypes.INamespace[]  {
        let namespaces:cpptypes.INamespace[] = [];

        Parser.findAllRegexMatches(
            NamespaceMatch.REGEX_STR,
            content,
            (rawMatch) => {
                let match = new NamespaceMatch (rawMatch);

                //TODO avoid recursion?
                let subNamespaces:cpptypes.INamespace[] = Parser.parseNamespaces(match.namespaceMatch);
                let newNamespace =new cpptypes.Namespace(match.nameMatch, subNamespaces);
                try {
                    newNamespace.deserialize(match.contentMatch);
                    namespaces.push(newNamespace);
                } catch (error) {
                    console.log(error, "Failed to parse namespace contents, skipping!"); // TODO API error? e.g showErrorMessage
                }
            }
        );
        
        return namespaces;
    }

    static parseStandaloneFunctiones(content:string): cpptypes.IFunction[] {
        let standaloneFunctions:cpptypes.IFunction[] = [];

        Parser.findAllRegexMatches(
            StandaloneFunctionMatch.REGEX_STR,
            content,
            (rawMatch) => {
                let match = new StandaloneFunctionMatch(rawMatch);
                standaloneFunctions.push(new cpptypes.StandaloneFunction(match.nameMatch, 
                    match.returnValMatch, 
                    match.argsMatch));
            }
        );

        return standaloneFunctions;
    }
    
    static parseGeneralClasses(content:string):cpptypes.IClass[] {
        let classes:cpptypes.IClass[] = [];

        Parser.findAllRegexMatches(
            ClassMatch.REGEX_STR,
            content,
            (rawMatch) => {
                let match = new ClassMatch(rawMatch);
                let newClass = new cpptypes.GeneralClass(match.nameMatch);
                try {
                    newClass.deserialize(match.bodyMatch);
                    classes.push(newClass);
                } catch (error) {
                    console.log(error, "Failed to parse class contents, skipping!");
                }

                //TODO nested classes -> rm from string and search again ? -> Howto add them to belonging class?
                // OR find until next class (greedy body search)
                // then find last class in file by different regex
                // finally parse the body recursevly
            }
        );

        return classes;
    }
    
    private static findAllRegexMatches(regex:string, 
            content:string, 
            onMatch: (rawMatch:RegExpExecArray) => void) {
        if (!content) {
            return;
        }

        const regexMatcher = new RegExp(regex, 'g');
        return Parser.findRegexMatches(regexMatcher, content, onMatch);
    }

    private static findRegexMatches(regexMatcher:RegExp, 
            content:string, 
            onMatch: (rawMatch:RegExpExecArray) => void) {
        if (!content) {
            return;
        }
        let rawMatch;
        while ((rawMatch = regexMatcher.exec(content)) !== null) {
            if (rawMatch.index === regexMatcher.lastIndex) {
                regexMatcher.lastIndex++;
            }
            onMatch(rawMatch);
        }
    }
}