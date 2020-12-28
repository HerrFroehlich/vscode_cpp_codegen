import { IClass, IFunction, SerializableMode } from "./TypeInterfaces";
import {Parser} from "../Parser";
import { ClassNameGenerator, TextFragment } from "../io";

class ClassBase implements IClass {
    constructor(    
        public readonly name:string,
        public readonly inheritance:string[]) {
        
    }

    deserialize (data: TextFragment) {
        
        this.nestedClasses = this.nestedClasses.concat(Parser.parseClasses(data));

        const privateContent:TextFragment = Parser.parseClassPrivateScope(data);
        this.privateFunctions = Parser.parseClassMemberFunctions(privateContent, this.classNameGen);

        const publicContent:TextFragment = Parser.parseClassPublicScope(data);
        this.publicFunctions = Parser.parseClassMemberFunctions(publicContent, this.classNameGen);

        const protectedContent:TextFragment = Parser.parseClassProtectedScope(data);
        this.protectedFunctions = Parser.parseClassMemberFunctions(protectedContent, this.classNameGen);
    }

    serialize (mode:SerializableMode) {
        return "";
    }

    protected classNameGen: ClassNameGenerator = new ClassNameGenerator(this.name, false);

    publicFunctions:IFunction[] = [];
    privateFunctions:IFunction[] = [];
    nestedClasses: IClass[] = [];
    protectedFunctions:IFunction[] = [];
}

export class ClassImpl extends ClassBase {
    //TODO
    serialize (mode:SerializableMode) {
        return "";
    }
} 

export class ClassInterface extends ClassBase {
    //TODO
    serialize (mode:SerializableMode) {
        return "";
    }

    protected classNameGen: ClassNameGenerator = new ClassNameGenerator(this.name, true);
} 