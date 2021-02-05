
import {TextScope} from "./Text";
import {ISerializable} from "./ISerial";

export interface ISignaturable {
    textScope: TextScope
    signature: string;
    namespaces: string[];
    serializable?: ISerializable;
}

export function compareSignaturables(signaturable: ISignaturable, otherSignaturable: ISignaturable, availableNamespaces: string[] = []): boolean {
    // TODO function arg signature
    if (signaturable.signature !== otherSignaturable.signature) {
        return false;
    } else {
        const namespaceDiff = signaturable.namespaces
        .filter(ns => !otherSignaturable.namespaces.includes(ns))
        .concat(otherSignaturable.namespaces.filter(ns => !signaturable.namespaces.includes(ns)));
        if (!namespaceDiff.length) {
            return true;
        }
        
        return namespaceDiff.every((ns => availableNamespaces.includes(ns)));
    }
}