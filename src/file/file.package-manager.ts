import { PackageJson as BasePackageJson } from "type-fest";

import { JsonFileManager } from "./file.manager";

class Package extends JsonFileManager<PackageJson> {
    constructor() {
        super({ name: "package.json" });
    }

    /** Read the package.json for a directory, if it hasn't been read already. */
    async read(cwd?: string) {
        return super.read(cwd);
    }

    /** Save a package.json to a directory. */
    async save(cwd?: string, json?: PackageJson | ((current: PackageJson) => PackageJson)) {
        return super.save(cwd, json);
    }

    /** Write a package.json file to a directory (defaults to the runtime directory). If no `json` is passed
     * then it will attempt to read the a loaded `package.json`. */
    async write(cwd?: string, json?: PackageJson) {
        return super.write(cwd, json);
    }

    /** Get the path for a `package.json` file in a directory. */
    path(cwd: string) {
        return super.path(cwd);
    }
}

export interface PackageJson extends BasePackageJson {
    /** For projects using `yarn` */
    workspaces?: string[];
}

/** Manager for package.json files. */
const P = new Package();

export { P as Package };
