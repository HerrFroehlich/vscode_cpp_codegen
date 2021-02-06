import { IClass, IFunction, INamespace} from "./TypeInterfaces";
import { HeaderParser } from "./HeaderParser";
import * as io from "../io";
export class Namespace  extends io.TextScope implements INamespace {
    
    constructor(name:string, scope:io.TextScope,  nameInputProvider?: io.INameInputProvider) {

        super(scope.scopeStart, scope.scopeEnd);
        this.name = name;
        this.classes = [];
        this.functions = [];
        this.subnamespaces = [];
        this._nameInputProvider = nameInputProvider;
    }

    tryAddNestedNamespace(possibleNestedNamespace: INamespace): boolean {
        if (this.fullyContains(possibleNestedNamespace)) {
            this.subnamespaces.push(possibleNestedNamespace);
            return true;
        }
        return false;
    }

    async serialize (mode:io.SerializableMode) {
        let serial = "namespace " +  this.name + " {\n\n"; 
        serial += await io.serializeArray(this.functions, mode);
        serial += await io.serializeArray(this.classes, mode);
        serial += "}";
        return serial;
    }

    deserialize (data: io.TextFragment) {
        this.classes = HeaderParser.parseClasses(data, this._nameInputProvider);
        this.functions = HeaderParser.parseStandaloneFunctiones(data);
    }

    getSignatures(): io.ISignaturable [] {
        const signaturables:io.ISignaturable[] = [];  
        const classSignatures = ([] as io.ISignaturable[]).concat(...this.classes.map(cppClass => cppClass.getSignatures()));   
        classSignatures.forEach(signature => signature.namespaces.unshift(this.name));
        signaturables.push(...classSignatures);
        const nsSignatures =  ([] as io.ISignaturable[]).concat(...this.subnamespaces.map(ns => ns.getSignatures()));    
        nsSignatures.forEach(signature => signature.namespaces.unshift(this.name));
        signaturables.push(...nsSignatures);
        signaturables.push(...this.functions.map(func => {
            const signature = func.getSignature();
            signature.namespaces.unshift(this.name);
            return signature;
        } ));
        
        return signaturables;
    }

    name:string;
    classes:IClass[]; 
    functions:IFunction[];
    subnamespaces: INamespace[];
    
    private readonly _nameInputProvider: io.INameInputProvider | undefined;
}

export class NoneNamespace extends io.TextScope implements INamespace {
    
    constructor(scope:io.TextScope, nameInputProvider?: io.INameInputProvider) {
        super(scope.scopeStart, scope.scopeEnd);
        this.name = "";
        this.classes = [];
        this.functions = [];
        this.subnamespaces = [];
    }

    tryAddNestedNamespace(possibleNestedNamespace: INamespace): boolean {
        return false;
    }

    async serialize (mode:io.SerializableMode) {
        let serial:string = await io.serializeArray(this.functions, mode);
        serial += await io.serializeArray(this.classes, mode);
        return serial;
    }

    deserialize (data: io.TextFragment) {
        this.classes = HeaderParser.parseClasses(data, this._nameInputProvider);
        this.functions = HeaderParser.parseStandaloneFunctiones(data);
    }

    getSignatures(): io.ISignaturable [] {
        const signaturables:io.ISignaturable[] = [];  
        const classSignatures = ([] as io.ISignaturable[]).concat(...this.classes.map(cppClass => cppClass.getSignatures()));   
        signaturables.push(...classSignatures);
        const nsSignatures =  ([] as io.ISignaturable[]).concat(...this.subnamespaces.map(ns => ns.getSignatures()));    
        signaturables.push(...nsSignatures);
        signaturables.push(...this.functions.map(func => func.getSignature()));
        
        return signaturables;
    }

    readonly name:string;
    classes:IClass[]; 
    functions:IFunction[];
    readonly subnamespaces:INamespace[];
    private readonly _nameInputProvider: io.INameInputProvider | undefined;
}