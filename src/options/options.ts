import path from "path";

import fs from "fs-extra";

import { SCRIPTS_DIRNAME } from "../cli/cli.constants";

import { AcenoRC } from "./options.result";
import { assignOptions } from "./options.assign";
import { runtimeArgsConfig } from "./options.args";
import { setOptionsFromFile } from "./options.from-file";

class Options {
    readonly current: AcenoRC = {
        cwd: "",
        tsconfig: "tsconfig.json",
        dev: process.env.NODE_ENV === "development",
        ...runtimeArgsConfig,
    };

    private _promiseMap = new Map<string, Promise<void>>();
    private _loaded = new Set<string>();
    private _promise: Promise<void>;

    /** Ensure that all options are loaded. */
    get promise() {
        if (!this._promise) {
            this._promise = Promise.resolve().then(async () => {
                this.load(this.cwd);

                while (this._promiseMap.size) {
                    await Promise.all(this._promiseMap.values());
                }

                await Promise.all([
                    Promise.resolve().then(async () => {
                        if (!(await fs.pathExists(this.distCwd))) {
                            await fs.mkdirs(this.distCwd);
                        }
                    }),

                    Promise.resolve().then(async () => {
                        this.usingYarn = await fs.pathExists(path.join(this.cwd, "yarn.lock"));
                    }),
                ]);

                if (!this.current.scripts) {
                    this.current.scripts = [];
                }

                const cwdScripts = path.join(this.cwd, SCRIPTS_DIRNAME);
                const acenoScripts = path.join(__dirname, "../_scripts");

                if (!this.current.scripts.includes(cwdScripts) && (await fs.pathExists(cwdScripts))) {
                    this.current.scripts.push(cwdScripts);
                }

                if (!this.current.scripts.includes(acenoScripts)) {
                    this.current.scripts.push(acenoScripts);
                }
            });
        }

        return this._promise;
    }

    load(cwd: string) {
        const importCwd = path.resolve(this.cwd, cwd);

        if (this._loaded.has(importCwd)) {
            return;
        }

        if (!this._promiseMap.has(importCwd)) {
            this._promiseMap.set(
                importCwd,
                setOptionsFromFile({ cwd: importCwd }).then(() => {
                    this._promiseMap.delete(importCwd);
                    this._loaded.add(importCwd);
                }),
            );
        }

        return this._promiseMap.get(importCwd);
    }

    set(config: Partial<AcenoRC>) {
        assignOptions({ current: this.current, assigned: config });
        return this;
    }

    usingYarn: boolean;

    get cwd() {
        if (!this.current.cwd) {
            return process.cwd();
        }

        return path.join(process.cwd(), this.current.cwd);
    }

    get distCwd() {
        return path.join(this.cwd, "dist", this.current.dev ? (this.current.id ? this.current.id + ".dev" : "dev") : this.current.id || "");
    }
}

const O = new Options();
export { O as Options };
