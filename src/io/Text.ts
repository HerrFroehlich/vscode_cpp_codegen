import { assert } from "console";
import { off } from "process";

export class TextScope {
    constructor(public readonly scopeStart:number,
                public readonly scopeEnd:number) {
                    assert(scopeStart <= scopeEnd, "scopeEnd must be greater than scopeStart");
                    assert(scopeStart>=0, "Scope start muss be greater zero!");
                    assert(scopeEnd>=0, "Scope end muss be greater zero!");
                }

    fullyContains(other:TextScope):boolean {
        return ((this.scopeStart <= other.scopeStart) && (this.scopeEnd >= other.scopeEnd));
    }

    contains(other:TextScope):boolean {
        return (other.scopeStart <= this.scopeEnd) && (other.scopeEnd >= this.scopeStart);
    }

    static merge(...scopes:TextScope[]):TextScope[] {

        if (scopes.length <= 1) {
            return scopes;
        }

        const mergedScopes:TextScope[] = [];
        scopes = scopes.sort((a,b) => {
            return a.scopeStart - b.scopeStart;
        });

        for (let index = 1; index < scopes.length; index++) {
            const scope = scopes[index-1];
            const nextScope = scopes[index];

            if (scope.contains(nextScope)) {
                mergedScopes.push(new TextScope(scope.scopeStart, nextScope.scopeEnd));
            } else {
                mergedScopes.push(scope);
                if (index === scopes.length-1) {
                    mergedScopes.push(nextScope);
                }
            }
        }
        return mergedScopes;
    }
}

export class TextRegexMatch extends TextScope {
    
    fullMatch:string;
    groupMatches:string[];
    

    static fromRegexExec(execMatch:RegExpExecArray, scopeOffset:number) {
        return new TextRegexMatch(execMatch, scopeOffset + execMatch.index);
    }    
    
    static fromTextBlock(textBlock:TextBlock) {
        return new TextRegexMatch([textBlock.content], textBlock.scopeStart);
    }

    private constructor(matches:Array<string>, scopeStart:number) {

        super(scopeStart, scopeStart + matches[0].length-1);
        this.fullMatch = matches[0];
        this.groupMatches = matches.slice(1);
    }
    
    getGroupMatchScope(index:number): TextRegexMatch|undefined {
        assert(index < this.groupMatches.length, "Group match index out of bounds ");
        const groupMatch = this.groupMatches[index];
        if (groupMatch && groupMatch.length) {
            const offset = this.fullMatch.indexOf(groupMatch);
            return new TextRegexMatch([groupMatch], this.scopeStart+offset);
        }
        return undefined;
    }
}

export class TextBlock extends TextScope {
    public readonly content:string;
    constructor(content:string,
                scopeOffset:number = 0) {
                    assert(content.length > 0, "Content is empty");
                    super(scopeOffset, scopeOffset + content.length-1);
                    this.content = content;
                }
    
    private splice(scopes:TextScope[]):TextBlock[] {
        let splittedBlocks:TextBlock[] =  [];
        scopes = TextScope.merge(...scopes);
        let lastStart = this.scopeStart;

        const trySliceContent = (start:number, end:number) => {
            let startRel = start-this.scopeStart;
            startRel = (startRel < 0) ? 0 : startRel;
            let endRel = end-this.scopeStart;
            endRel = (endRel < 0) ? 0 : endRel;
            if (endRel > startRel) {
                splittedBlocks.push(new TextBlock(this.content.slice(startRel,endRel), this.scopeStart+start));
            }
        };

        scopes.forEach(
            (scope, index) => {
                trySliceContent(lastStart,scope.scopeStart);
                lastStart = scope.scopeEnd+1;
                
                if(index === scopes.length-1) {
                    trySliceContent(scope.scopeEnd+1,this.content.length);
                }
            }
        );

        if (!splittedBlocks.length) {
            splittedBlocks.push(this);
        }

        return splittedBlocks;
     } 

     private matchContent(regex:string):TextRegexMatch[] {
        const regexMatches:TextRegexMatch[] = []; 
        const regexMatcher = new RegExp(regex, 'g'); 
        let rawMatch:any;
        while ((rawMatch = regexMatcher.exec(this.content)) !== null) 
        {
            if (rawMatch.index === regexMatcher.lastIndex) {
                regexMatcher.lastIndex++;
            }
            regexMatches.push(TextRegexMatch.fromRegexExec(rawMatch, this.scopeStart));
        }
        return regexMatches;
     }

     removeMatching (regex:string):[TextBlock[], TextRegexMatch[]] {
        const regexMatches:TextRegexMatch[] = this.matchContent(regex); 
        return [this.splice(regexMatches), regexMatches];
    }

    removeNotMatching (regex:string):[TextBlock[], TextRegexMatch[]] {
        const regexMatches:TextRegexMatch[] = this.matchContent(regex); 
        const inverseRegexMatches:TextRegexMatch[] = [];
        const remainingBlocks:TextBlock[] = [];
        this.splice(regexMatches).forEach(
            (splicedBlock) => {
                inverseRegexMatches.push(TextRegexMatch.fromTextBlock(splicedBlock));
            }
        );

        regexMatches.forEach(
            (match) => {
                remainingBlocks.push(new TextBlock(match.fullMatch, match.scopeStart));
            }
        );
        if (!remainingBlocks.length) {
            remainingBlocks.push(this);
        }

        return [remainingBlocks, inverseRegexMatches];
    }
}

export class TextFragment {
    readonly blocks:TextBlock[] = [];
    constructor(content:string) {
        if (content.length) {
            this.blocks = [new TextBlock(content)];            
        }
    }

    removeMatching(regex:string):TextRegexMatch[] {
        const regexMatches:TextRegexMatch[] = [];
        for (let index = this.blocks.length-1; index >= 0; index--) {
            const block = this.blocks[index];
            const matchResult = block.removeMatching(regex);
            this.blocks.splice(index, 1, ...matchResult[0]);
            regexMatches.push(...matchResult[1]);
        }
        return regexMatches;
    }

	removeNotMatching(regex: string):TextRegexMatch[] {
        const inverseRegexMatches:TextRegexMatch[] = [];
        for (let index = this.blocks.length-1; index >= 0; index--) {
            const block = this.blocks[index];
            const matchResult = block.removeNotMatching(regex);
            this.blocks.splice(index, 1, ...matchResult[0]);
            inverseRegexMatches.push(...matchResult[1]);
        }
        return inverseRegexMatches;
	}
}
