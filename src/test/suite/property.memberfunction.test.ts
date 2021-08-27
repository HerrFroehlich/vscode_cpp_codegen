import * as fc from 'fast-check';
import { describe, it } from "mocha";

const validStringArbitrary = fc.string().filter(s => /^[a-zA-Z0-9&*<>:]+$/.test(s));

const whiteSpaceChars = ['\b', '\n', '\r', '\t'];
const whiteSpaceCharArbitrary = fc.integer({min: 0, max:whiteSpaceChars.length-1}).map(i => whiteSpaceChars[i]);
const whiteSpaceStringArbitrary = fc.stringOf(whiteSpaceCharArbitrary);

const memberFunctionArbitrary = fc.record({ //TODO friend + operator
    isVirtual: fc.boolean(),
    isPure: fc.boolean(),
    isStatic: fc.boolean(),
    isConst: fc.boolean(),
    returnValues: fc.array(validStringArbitrary, {minLength: 1}),
    functionName: validStringArbitrary,
    functionArguments: fc.array(fc.array(validStringArbitrary)),
    whiteSpaceGenerator: fc.infiniteStream(whiteSpaceStringArbitrary)
}).filter(t => !(t.isPure && !t.isVirtual) && !(t.isStatic && t.isVirtual) )
.map(t => {
    const addTrailingWhitespace = (s: string) => s + t.whiteSpaceGenerator.next().value;
    const addWord = (s:string, k:string) => addTrailingWhitespace(s+k);
    const reduceWithWhitespace = (a: string[], separator?: string) =>
        a.reduce((acc, s, idx) => s && separator && idx !== a.length-1 ? addWord(acc, addWord(addTrailingWhitespace(s), separator)) : addWord(acc, s), "");

    let memberFnctString = addTrailingWhitespace("");
    if (t.isVirtual) {
        memberFnctString = addWord(memberFnctString, "virtual ");
    }
    if (t.isStatic) {
        memberFnctString = addWord(memberFnctString, "static ");
    }

    memberFnctString += reduceWithWhitespace(t.returnValues);
    memberFnctString = addWord(memberFnctString, " ");
    memberFnctString = addWord(memberFnctString, t.functionName);
    memberFnctString = addWord(memberFnctString, " (");
    memberFnctString += reduceWithWhitespace(t.functionArguments.map(a => reduceWithWhitespace(a)), ",");
    memberFnctString = addWord(memberFnctString, ")");
    
    if (t.isConst) {
        memberFnctString = addWord(memberFnctString, "const ");
    }

    if (t.isPure) {
        memberFnctString = addWord(memberFnctString, "=");
        memberFnctString = addWord(memberFnctString, "0");
    }


    memberFnctString = addWord(memberFnctString, ";");


    return memberFnctString;
});

describe('Member function property tests', () => {
    it.only('test', () => {
        console.log(        fc.sample(
            memberFunctionArbitrary, // arbitrary or property to extract the values from
            1             // number of values to extract
        )[0]);
    });
});