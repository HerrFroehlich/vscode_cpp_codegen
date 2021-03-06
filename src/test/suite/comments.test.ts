import * as assert from "assert";
import { Done, describe, it, test } from "mocha";
import { callItAsync } from "./utils";
import { HeaderParser } from "../../io/HeaderParser";
import { TextFragment } from "../../io";
import { ClassNameGenerator, MemberFunction } from "../../cpp";

const argData = [
  "",
  "int test",
  "int test1, const Class* test2, void* test3",
  "int \ttest1,\t\n const\n Class* test2\n, void* test3\n\t",
];
suite("Comments Tests", () => {
  test("ParseCommentedSingleMemberFunction", (done) => {
    const testContent = TextFragment.createFromString("//int fncName();");
    const testClassName = "TestClass";
    const classNameGen = new ClassNameGenerator(testClassName, false);

    HeaderParser.parseComments(testContent);
    let parsedFunctions = HeaderParser.parseClassMemberFunctions(
      testContent,
      classNameGen
    );
    assert.strictEqual(parsedFunctions.length, 0);

    done();
  });

  describe("ParseBlockCommentedMemberFunction", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (done: Done, arg: string) {
        const testContent = TextFragment.createFromString(
          "/* int fncName(" + arg + "); */"
        );
        const testClassName = "TestClass";
        const classNameGen = new ClassNameGenerator(testClassName, false);

        HeaderParser.parseComments(testContent);
        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          classNameGen
        );
        assert.strictEqual(parsedFunctions.length, 0);

        done();
      }
    );
  });

  test("ParseCommentedAndNonCommentedMemberFunction", (done) => {
    const testContent = TextFragment.createFromString(`
		int fncName(); 
		//void fncName2();
		int fncName3();`);
    const testClassName = "TestClass";
    const classNameGen = new ClassNameGenerator(testClassName, false);

    HeaderParser.parseComments(testContent);
    let parsedFunctions = HeaderParser.parseClassMemberFunctions(
      testContent,
      classNameGen
    );
    assert.strictEqual(parsedFunctions.length, 2);

    done();
  });
});
