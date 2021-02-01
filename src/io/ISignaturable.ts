
import {TextScope} from "./Text";
import {ISerializable} from "./ISerial";

export interface ISignaturable {
    textScope: TextScope
    signature: string;
    namespaces: string[];
    serializable?: ISerializable;
    compare(other:ISignaturable, availableNamespaces?:string[]): boolean;
}