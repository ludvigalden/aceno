import path from "path";

import fs from "fs-extra";

import { Env } from "./env";
import { Options } from "./options";
import { Package, Tsconfig } from "./file";

class Aceno {
    options: typeof Options = Options;
    env: typeof Env = Env;
    tsconfig: typeof Tsconfig = Tsconfig;
    package: typeof Package = Package;

    private _promise: Promise<void>;

    get promise() {
        if (!this._promise) {
            this._promise = Promise.resolve().then(async () => {
                await Promise.all([this.options.promise, this.env.promise, this.tsconfig.promise, this.package.promise]);
            });
        }

        return this._promise;
    }

    writeDistFile(distPath: string, data: any, options?: fs.WriteFileOptions) {
        if (!fs.existsSync(this.distCwd)) {
            fs.mkdirSync(this.distCwd, { recursive: true });
        }

        return fs.writeFileSync(path.join(this.distCwd, distPath), data, options);
    }

    async init() {
        const tsconfig = await Tsconfig.read();

        if (tsconfig) {
            const processTsconfig = Options.cwd !== process.cwd() && tsconfig ? tsconfig.relativize(process.cwd()) : tsconfig;

            await import("ts-node").then((tsNode) => {
                return tsNode.register({
                    transpileOnly: true,
                    compilerOptions: processTsconfig.current.compilerOptions,
                    skipProject: true,
                });
            });

            if (Object.keys(processTsconfig.current.compilerOptions.paths).length) {
                await import("tsconfig-paths").then((tsconfigPaths) => {
                    tsconfigPaths.register({
                        baseUrl: processTsconfig.current.compilerOptions.baseUrl || "./",
                        paths: processTsconfig.current.compilerOptions.paths,
                    });
                });
            }
        }
    }

    get cwd() {
        return this.options.cwd;
    }

    get distCwd() {
        return this.options.distCwd;
    }

    get tsconfigPath() {
        return this.tsconfig.parsedPath;
    }
}

const aceno = new Aceno();
export { aceno as Aceno };
