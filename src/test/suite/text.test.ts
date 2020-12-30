import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';
import {Parser} from '../../Parser';
import {IFunction} from '../../cpptypes';
import * as io from   '../../io';

suite('Text Utility Tests', () => {
	test('Textblock should have correct scope on construction', (done) => {
		const testContent = "FCK 2020";
		const testOff = 42;
		const textBlock = new io.TextBlock(testContent, testOff);

		assert.strictEqual(textBlock.content, testContent);
		assert.strictEqual(textBlock.scopeStart, 42);
		assert.strictEqual(textBlock.scopeEnd, 42+testContent.length-1);
		done();
	});
	
	test('Textblock fullyContain check', (done) => {
		const testContent = "This is a test message";
		const subStrStart = 4;
		const subStrEnd = 12;
		const textBlock1 = new io.TextBlock(testContent);
		const textBlock2 = new io.TextBlock(testContent.substr(subStrStart,subStrEnd), subStrStart);

		assert.ok(textBlock1.fullyContains(textBlock2));

		done();
	});
	
	test('Textblock contains check', (done) => {
		const testContent = "This is a test message";
		const subStrStart = 0;
		const subStrEnd = 8;
		const subStrStart2 = 4;
		const subStrEnd2 = 12;
		const textBlock1 = new io.TextBlock(testContent.substr(subStrStart,subStrEnd), subStrStart);
		const textBlock2 = new io.TextBlock(testContent.substr(subStrStart2,subStrEnd2), subStrStart2);

		assert.ok(textBlock1.contains(textBlock2));

		done();
	});
	
	
	test('TextScope merge', (done) => {
		const testContent = "This is a test message";
		const subStrStart = 0;
		const subStrEnd = 8;
		const subStrStart2 = 4;
		const subStrEnd2 = 12;
		const textBlock1 = new io.TextBlock(testContent.substr(subStrStart,subStrEnd), subStrStart);
		const textBlock2 = new io.TextBlock(testContent.substr(subStrStart2,subStrEnd2-subStrStart2), subStrStart2);

		const mergedScopes = io.TextScope.merge(textBlock1, textBlock2);

		assert.strictEqual(mergedScopes.length,1);
		assert.strictEqual(mergedScopes[0].scopeStart, textBlock1.scopeStart);
		assert.strictEqual(mergedScopes[0].scopeEnd, textBlock2.scopeEnd);

		done();
	});
	
	test('Textblock removes single regex match', (done) => {
		const testContent = "This is a test message";
		const regex = "test";
		const textBlock = new io.TextBlock(testContent);

		const [slicedBlocks, matches] = textBlock.removeMatching(regex);
		
		assert.strictEqual(slicedBlocks.length,2);
		assert.strictEqual(slicedBlocks[0].content, "This is a ");
		assert.strictEqual(slicedBlocks[0].scopeStart, 0);
		assert.strictEqual(slicedBlocks[0].scopeEnd, testContent.indexOf(regex)-1);
		assert.strictEqual(slicedBlocks[1].content, " message");
		assert.strictEqual(slicedBlocks[1].scopeStart, testContent.indexOf(regex)+regex.length);
		assert.strictEqual(slicedBlocks[1].scopeEnd, testContent.length-1);

		assert.strictEqual(matches.length,1);
		assert.strictEqual(matches[0].fullMatch, regex);

		done();
	});

	test('Textblock removes multiple regex match', (done) => {
		let testContent = "";
		const regex = "test";
		const spaceStr = "[SPACE]";
		const iter = 5;
		for (let i = 0; i < iter; i++) {
			testContent += spaceStr+regex;
		}
		const textBlock = new io.TextBlock(testContent);

		const [slicedBlocks, matches] = textBlock.removeMatching(regex);
		
		assert.strictEqual(slicedBlocks.length,iter);
		assert.strictEqual(matches.length,iter);
		for (let index = 0; index < iter; index++) {			
			assert.strictEqual(slicedBlocks[index].content, spaceStr);
			const start = index*testContent.length;
			assert.strictEqual(slicedBlocks[index].scopeStart, start);
			assert.strictEqual(slicedBlocks[index].scopeEnd, start+spaceStr.length-1);
			assert.strictEqual(matches[index].fullMatch, regex);
		}

		done();
	});
});
