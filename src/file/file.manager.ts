import path from "path";

import fs from "fs-extra";

import { Options } from "../options";

/** Serves utilies for managing a file available in core directories, e.g. `package.json` and `lerna.json` files. */
export class FileManager<T> {
    protected loading = new Map<string, Promise<T | undefined>>();
    protected loaded = new Map<string, T | undefined>();

    protected options: FileManagerOptions<T>;

    protected _promise: Promise<void>;

    constructor(options: FileManagerOptions<T>) {
        this.options = options;
    }

    /** Intended be resolved before use. */
    get promise() {
        if (!this._promise) {
            this._promise = Promise.resolve().then(async () => {
                await Options.promise;

                if (this.options.requiredIndex) {
                    await this.read();
                } else {
                    try {
                        await this.read();
                    } catch (e) {}
                }
            });
        }

        return this._promise;
    }

    get current() {
        return this.loaded.get(this.path());
    }

    /** Update the content of the file from the file system. */
    hydrate(cwd = "") {
        const filePath = this.path(cwd);

        if (!this.loaded.has(filePath)) {
            return this.read(cwd);
        } else {
            if (!this.loading.has(filePath)) {
                this.loading.set(
                    filePath,
                    this.read(filePath).then((file) => {
                        this.loaded.set(filePath, file);
                        this.loading.delete(filePath);

                        return file;
                    }),
                );
            } else {
                this.loading.set(
                    filePath,
                    Promise.all([this.loading.get(filePath), this.read(filePath)]).then((files) => {
                        this.loaded.set(filePath, files[1]);
                        this.loading.delete(filePath);

                        return files[1];
                    }),
                );
            }

            return this.loading.get(filePath);
        }
    }

    /** Read the file for a directory, if it hasn't been read already. */
    async read(cwd = "") {
        const filePath = this.path(cwd);

        if (!this.loaded.has(filePath)) {
            if (!this.loading.has(filePath)) {
                this.loading.set(
                    filePath,
                    this.readFile(filePath)
                        .then((file) => {
                            this.loaded.set(filePath, file || undefined);
                            this.loading.delete(filePath);

                            return file;
                        })
                        .catch((err) => {
                            if (cwd !== "" || this.options.requiredIndex) {
                                throw err;
                            }

                            this.loaded.set(filePath, undefined);

                            return undefined;
                        }),
                );
            }

            return this.loading.get(filePath);
        }

        return this.loaded.get(filePath);
    }

    /** Save a file to a directory. */
    async save(cwd = "", file?: T | ((current: T) => T)) {
        if (typeof file === "function") {
            const current = await this.read(cwd);

            await this.write(cwd, (file as any)(current));
        } else {
            await this.write(cwd, file);
        }
    }

    /** Write a file to a directory (defaults to the runtime directory). If no `file` is passed then it will attempt to read the a loaded. */
    async write(cwd = "", file?: T) {
        const filePath = this.path(cwd);

        if (!file) {
            if (this.loaded.has(filePath)) {
                file = this.loaded.get(filePath);
            } else if (this.loading.has(filePath)) {
                return console.warn(`The "${this.options.name}" is currently being read, so there's no need to write it.`);
            } else {
                throw new Error(`Could not find a "${this.options.name}" to write for path "${filePath}".`);
            }
        }

        if (!(await fs.pathExists(path.dirname(filePath)))) {
            await fs.mkdirs(path.dirname(filePath));
        }

        await this.writeFile(filePath, file);
    }

    /** Get the path for a file in a directory. */
    path(cwd = "") {
        if (this.options.name) {
            if (cwd === "") {
                return path.join(Options.cwd, this.options.name);
            } else {
                return path.join(path.resolve(Options.cwd, cwd.split("/" + this.options.name).join("")), this.options.name);
            }
        } else {
            if (cwd === "") {
                if (!this.options.defaultName) {
                    throw new Error(`A file name must be passed or set in the options!`);
                }

                return path.join(Options.cwd, this.options.defaultName);
            } else {
                return path.resolve(Options.cwd, cwd);
            }
        }
    }

    protected async writeFile(_filePath: string, _file: T | undefined): Promise<void> {
        throw new Error(`The "writeFile" method must be implemented`);
    }

    protected async readFile(_filePath: string): Promise<T> {
        throw new Error(`The "readFile" method must be implemented`);
    }
}

/** Serves utilies for managing a file available in working directories, e.g. `package.json` and `lerna.json` files. */
export class JsonFileManager<T> extends FileManager<T> {
    protected async readFile(filePath: string): Promise<T> {
        return fs
            .readFile(filePath, {
                encoding: "utf-8",
            })
            .then((read) => JSON.parse(read));
    }

    protected async writeFile(filePath: string, json: T) {
        return fs.writeFile(filePath, JSON.stringify(json, null, "\t"), {
            encoding: "utf-8",
        });
    }
}

interface FileManagerOptions<_T> {
    /** The file name, e.g. "package.json". If undefined, the `cwd`:s passed to the paths must include the file name as well. */
    name?: string;
    /** The default file name to use, e.g. `"tsconfig.json"`. */
    defaultName?: string;
    /** Whether to throw errors when failed reading the file in the `cwd`. */
    requiredIndex?: boolean;
}
