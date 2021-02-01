import * as io from "../io";
import { IFunction} from "./TypeInterfaces";

class StandaloneFunctionSignature implements io.ISignaturable {
    constructor(standaloneFunction: StandaloneFunction) {
        this.textScope = standaloneFunction as io.TextScope;
        this.signature = standaloneFunction.name + "(" + standaloneFunction.args.replace(/\s/g,'') + ")";
        this.serializable = standaloneFunction as io.ISerializable;
    }
    textScope: io.TextScope;
    signature: string;
    namespaces: string[] = [];

    serializable: io.ISerializable;
    compare(other: io.ISignaturable, availableNamespaces: string[] = []): boolean {
        // TODO function arg signature
        if (this.signature !== other.signature) {
            return false;
        } else {
            const namespaceDiff = this.namespaces
            .filter(ns => !other.namespaces.includes(ns))
            .concat(other.namespaces.filter(ns => !this.namespaces.includes(ns)));
            if (!namespaceDiff.length) {
                return true;
            }
            
            return namespaceDiff.every((ns => availableNamespaces.includes(ns)));
        }
    }
}

export class StandaloneFunction extends io.TextScope implements IFunction {
    constructor(public readonly name:string, 
                public readonly returnVal:string, 
                public readonly args:string,
                scope: io.TextScope) {
                    super(scope.scopeStart, scope.scopeEnd);
    }
    
    getSignature(): io.ISignaturable {
        return new StandaloneFunctionSignature(this);
    }

    serialize(mode:io.SerializableMode) {
        let serial = "";
        
        switch (mode) {
            case io.SerializableMode.source:
                serial = this.getHeading() + " {\n";
                if (this.returnVal !== "void") {
                    serial = serial + this.returnVal + " returnValue;\n return returnValue;\n";
                }
                serial += "}";
                break;
            
            case io.SerializableMode.interfaceHeader:
            case io.SerializableMode.implHeader:
                serial = this.getHeading() + ";";
                break;

            default:
                break;
        }
    
        return serial;
    }

    private getHeading() {
        return this.returnVal + " " + this.name + " (" + this.args + " )";
    }
}