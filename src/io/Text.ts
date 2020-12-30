import { assert } from "console";
import { off } from "process";

export class TextScope {
    constructor(public readonly scopeStart:number,
                public readonly scopeEnd:number) {
                    assert(scopeStart <= scopeEnd, "scopeEnd must be greater than scopeStart");
                }

    fullyContains(other:TextScope):boolean {
        return ((this.scopeStart <= other.scopeStart) && (this.scopeEnd >= other.scopeEnd));
    }

    contains(other:TextScope):boolean {
        return (other.scopeStart <= this.scopeEnd) && (other.scopeEnd >= this.scopeStart);
    }
}

export class TextRegexMatch extends TextScope {
    
    fullMatch:string;
    groupMatches:string[];
    

    static fromRegexExec(execMatch:RegExpExecArray, scopeOffset:number) {
        return new TextRegexMatch(execMatch, scopeOffset + execMatch.index);
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

class TextBlock extends TextScope {
    public readonly content:string;
    constructor(content:string,
                scopeOffset:number = 0) {
                    assert(content.length > 0, "Content is empty");
                    super(scopeOffset, scopeOffset + content.length-1);
                    this.content = content;
                }
    
    private removeRelative(start:number,
            end:number):TextBlock[] {
        let splittedBlocks:TextBlock[] =  [];
        assert(end >= start, "End must be greater than start");
        assert(start >= 0, "Start must be greater than 0");
        assert(end >= 0, "End must be greater than 0");
        
        const contentLength = this.content.length; 
        if (start < contentLength) {
            if (start > 0) {
                splittedBlocks.push(new TextBlock(this.content.substr(0,start), this.scopeStart));
            }            
            if (end+1 < contentLength) {
                splittedBlocks.push(new TextBlock(this.content.substr(end+1), this.scopeStart + end+1));            
            }
        } else {
            splittedBlocks.push(this);
        }

        return splittedBlocks;
     } 

     removeMatching (regex:string):[TextBlock[], TextRegexMatch[]] {
        const splittedBlocks:TextBlock[] = [];
        const regexMatches:TextRegexMatch[] = []; 
        const regexMatcher = new RegExp(regex, 'g'); 
        let rawMatch:any;
        let lastEnd:number = -1;
        let lastStart:number = 0;
        let isPostponing:boolean = false;

        const tryTriggerPostponed = () => {
            if (isPostponing) {
                splittedBlocks.push(...this.removeRelative(lastStart,lastEnd));
                isPostponing = false;
            }
        };
        while ((rawMatch = regexMatcher.exec(this.content)) !== null) 
        {
            if (rawMatch.index === regexMatcher.lastIndex) {
                regexMatcher.lastIndex++;
            }

            const matchLength = rawMatch[0].length;
            const matchStart = rawMatch.index;
            const matchEnd = matchStart + matchLength-1;

            if (matchStart > lastEnd) {
                tryTriggerPostponed();
                splittedBlocks.push(...this.removeRelative(matchStart,matchEnd));
            } else if (!isPostponing) {
                isPostponing = true;
                lastStart = matchStart;
            }

            lastEnd = matchEnd;
            regexMatches.push(TextRegexMatch.fromRegexExec(rawMatch, this.scopeStart));
        }

        tryTriggerPostponed();
        if (!splittedBlocks.length) {
            splittedBlocks.push(this);
        }

        return [splittedBlocks, regexMatches];
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
}
