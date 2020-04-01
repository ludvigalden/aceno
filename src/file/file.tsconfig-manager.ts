import path from "path";

import fs from "fs-extra";

import { Options } from "../options";

import { FileManager } from "./file.manager";
import { TsconfigFile } from "./file.tsconfig";

class Tsconfig extends FileManager<TsconfigFile> {
    protected __promise: Promise<void>;

    constructor() {
        super({
            defaultName: "tsconfig.json",
        });
    }

    get promise() {
        if (!this.__promise) {
            this.__promise = super.promise.then(async () => {
                const read = await this.read();

                if (read) {
                    await fs.writeFile(this.parsedPath, read.relativize(path.dirname(this.parsedPath)).toJson(), {
                        encoding: "utf-8",
                    });
                }
            });
        }

        return this.__promise;
    }

    /** The path of the parsed `Tsconfig`. */
    get parsedPath(): string {
        return path.join(Options.distCwd, "tsconfig.json");
    }

    protected async writeFile(filePath: string, tsconfig: TsconfigFile): Promise<void> {
        const baseName = path.basename(filePath);

        let cwd: string;
        let writePath: string;

        if (baseName.includes("tsconfig")) {
            cwd = path.dirname(filePath);
            writePath = filePath;
        } else {
            cwd = filePath;
            writePath = path.join(filePath, "tsconfig.json");
        }

        if (cwd !== tsconfig.cwd) {
            const relativized = tsconfig.relativize(cwd);

            return fs.writeFile(writePath, relativized.toJson(), {
                encoding: "utf-8",
            });
        } else {
            return fs.writeFile(writePath, tsconfig.toJson(), {
                encoding: "utf-8",
            });
        }
    }

    protected async readFile(filePath: string): Promise<TsconfigFile> {
        const baseName = path.basename(filePath);

        if (baseName.includes("tsconfig")) {
            return TsconfigFile.find(path.dirname(filePath), baseName);
        } else {
            return TsconfigFile.find(filePath);
        }
    }
}

const T = new Tsconfig();

export { T as Tsconfig };
