import { assert } from "console";

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


export class TextBlock extends TextScope {
    public readonly content:string;
    constructor(content:string,
                scopeOffset:number = 0) {
                    assert(content.length > 0, "Content is empty");
                    super(scopeOffset, scopeOffset + content.length-1);
                    this.content = content;
                }
    
    private _removeRelative(start:number,
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

     matchAndRemove (regex:string, onMatch: (rawMatch:RegExpExecArray) => void):TextBlock[] {
        let splittedBlocks:TextBlock[] = [];
        const regexMatcher = new RegExp(regex, 'g'); 
        let rawMatch:any;
        let lastEnd:number = -1;
        let lastStart:number = 0;
        let isPostponing:boolean = false;

        const tryTriggerPostponed = () => {
            if (isPostponing) {
                splittedBlocks = splittedBlocks.concat(this._removeRelative(lastStart,lastEnd));
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
                splittedBlocks = splittedBlocks.concat(this._removeRelative(matchStart,matchEnd));
            } else if (!isPostponing) {
                isPostponing = true;
                lastStart = matchStart;
            }

            lastEnd = matchEnd;
            onMatch(rawMatch);
        }
        tryTriggerPostponed();
        if (!splittedBlocks.length) {
            splittedBlocks.push(this);
        }

        return splittedBlocks;
    }
}

export class TextFragment {
    readonly blocks:TextBlock[] = [];
    constructor(content:string) {
        if (content.length) {
            this.blocks = [new TextBlock(content)];            
        }
    }

    matchAndRemove(regex:string, onMatch: (rawMatch:RegExpExecArray) => void) {
        for (let index = this.blocks.length-1; index >= 0; index--) {
            const block = this.blocks[index];
            
            this.blocks.splice(index, 1, ...block.matchAndRemove(regex, onMatch));
        }
    }
}
