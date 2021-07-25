import { TextFragment, TextScope } from "./Text";
export enum SerializableMode {
  header, // matching header file (respective to current file, which is a Source)
  source, // matching source file (respective to current file, which is a Header)
  implHeader, // implementation header file (respective to current file, which has a class with pure virtual functions)
  implSource, // implementation source file (respective to current file, which has a class with pure virtual functions)
  interfaceHeader, // interface header file (respective to current file, which has a class with  virtual functions => pure virtual ones are generated)
}

export interface IClassNameProvider {
  getClassName(mode: SerializableMode, withOuterScope: boolean): string;
  originalName: string;
}

export interface INameInputProvider {
  getInterfaceName?(origName: string): string | Promise<string>;
}

export interface SerializationOptions {
  mode: SerializableMode;
  nameScopes?: string[];
  nameInputProvider?: INameInputProvider;
  range?: TextScope;
}

export interface ISerializable {
  serialize: (options: SerializationOptions) => string | Promise<string>;
}

export interface IFile extends ISerializable, IDeserializable {
  getPath(): string;
  readonly directory: string;
  readonly basename: string;
  readonly extension: string;
}

export function serializeArray(
  serializableArray: Array<ISerializable>,
  options: SerializationOptions,
  elementPrefix: string = "",
  elementSuffix: string = ""
): Promise<string> {
  return serializableArray.reduce(async (accumulate, serializable) => {
    let acummulatedSerialized = await accumulate;
    let serializedElement = await serializable.serialize(options);
    if (!serializedElement.length) {
      return acummulatedSerialized;
    }
    return (
      acummulatedSerialized + elementPrefix + serializedElement + elementSuffix
    );
  }, Promise.resolve(""));
}

export interface IDeserializable {
  deserialize: (data: TextFragment) => void;
}

class ISerializeDummyImpl implements ISerializable {
  serialize(options: SerializationOptions): string | Promise<string> {
    throw new Error("This class should not be used directly");
  }
}
type Constructor<T = {}> = new (...args: any[]) => T;
export function makeRangedSerializable<
  TBase extends Constructor<TextScope & ISerializeDummyImpl>
>(base: TBase) {
  return class RangedSerializable extends base {
    serialize(options: SerializationOptions): string | Promise<string> {
      if (options.range && !this.contains(options.range)) {
        return "";
      }
      return super.serialize(options);
    }
  };
}
