import * as io from "../io";
import { joinNameScopes } from "./utils";
export class ClassNameGenerator {
  constructor(private readonly _origName: string) {
    this._createdNames = new Map([
      [io.SerializableMode.header, _origName],
      [io.SerializableMode.source, _origName],
    ]);
  }

  async generate(
    nameInputProvider: io.INameInputProvider,
    mode: io.SerializableMode
  ): Promise<void> {
    switch (mode) {
      case io.SerializableMode.implHeader:
      case io.SerializableMode.implSource:
        await this.createImplName(nameInputProvider, mode);
      case io.SerializableMode.interfaceHeader:
        return this.createInterfaceName();
      default:
    }
  }

  get(options: io.SerializationOptions): string {
    let name = this._createdNames.get(options.mode);
    if (!name) {
      throw new Error("Internal Error: Class name was not generated yet!");
    }
    return name;
  }

  getClassNameProvider(
    outerClassNameProvider?: io.IClassNameProvider
  ): io.IClassNameProvider {
    return {
      originalName: this._origName,
      getClassName: (mode: io.SerializableMode, withOuterScope: boolean) => {
        const outerNameScope = withOuterScope
          ? outerClassNameProvider?.getClassName(mode, withOuterScope)
          : undefined;
        return joinNameScopes(outerNameScope, this._createdNames.get(mode));
      },
    };
  }

  private async createImplName(
    nameInputProvider: io.INameInputProvider,
    mode: io.SerializableMode
  ) {
    let implName = this._createdNames.get(mode);
    if (!implName) {
      if (nameInputProvider?.getInterfaceName) {
        implName = await nameInputProvider.getInterfaceName(this._origName);
      }
      // TODO naming conventions config
      else if (this._origName.startsWith("I")) {
        implName = this._origName.substring(1);
      } else {
        implName = this._origName + "Impl";
      }
      this._createdNames.set(io.SerializableMode.implHeader, implName);
      this._createdNames.set(io.SerializableMode.implSource, implName);
    }
  }

  private createInterfaceName() {
    // TODO naming conventions config
    const name = "I" + this._origName;
    this._createdNames.set(io.SerializableMode.interfaceHeader, name);
  }

  private _createdNames: Map<io.SerializableMode, string>;
}
