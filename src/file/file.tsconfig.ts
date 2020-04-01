import path from "path";

import fs from "fs-extra";
import findUp from "find-up";
import merge from "lodash-es/merge";
import omit from "lodash-es/omit";
import assign from "lodash-es/assign";

import { printAndExit } from "../util";

export class TsconfigFile {
    cwd: string;

    extends: string[] = [];
    current: TsconfigJson;

    /** Merge several `Tsconfig`:s into one. If their `cwd`:s are unequal, they will all be relativized
     * to the `cwd` of the last specified `Tsconfig`. */
    static async merge(...tsconfigs: TsconfigFile[]) {
        if (tsconfigs.length < 2) {
            throw new Error(`At least two Tsconfigs must be specified.`);
        }

        const created = new TsconfigFile({}, tsconfigs[tsconfigs.length - 1].cwd);

        await Promise.all(
            /** Properties such as `paths` need to be added first by he configs of higher importance. */
            [...tsconfigs.reverse()].map(async (tsconfig) => {
                if (tsconfig.cwd !== created.cwd) {
                    tsconfig = tsconfig.relativize(created.cwd);
                }

                for (const extendsPath of tsconfig.extends) {
                    if (!created.extends.includes(extendsPath)) {
                        created.extends.push(extendsPath);
                    }
                }

                if (tsconfig.current.extends) {
                    const extendsPath = path.join(tsconfig.cwd, tsconfig.current.extends);

                    if (!created.extends.includes(extendsPath)) {
                        created.extends.push(extendsPath);

                        tsconfig = await TsconfigFile.merge(
                            await TsconfigFile.find(path.dirname(extendsPath), path.basename(extendsPath)),
                            tsconfig,
                        );

                        for (const extendsPath of tsconfig.extends) {
                            if (!created.extends.includes(extendsPath)) {
                                created.extends.push(extendsPath);
                            }
                        }
                    }
                }

                Object.keys(tsconfig.current.compilerOptions.paths).forEach((pathKey) => {
                    if (!tsconfig.current.compilerOptions.paths[pathKey].length) {
                        return;
                    }

                    if (created.current.compilerOptions.paths[pathKey] == null || !created.current.compilerOptions.paths[pathKey].length) {
                        created.current.compilerOptions.paths[pathKey] = tsconfig.current.compilerOptions.paths[pathKey];
                    } else {
                        tsconfig.current.compilerOptions.paths[pathKey].forEach((pathResolver) => {
                            if (!created.current.compilerOptions.paths[pathKey].includes(pathResolver)) {
                                created.current.compilerOptions.paths[pathKey].push(pathResolver);
                            }
                        });
                    }
                });

                for (const include of tsconfig.current.include) {
                    if (!created.current.include.includes(include)) {
                        created.current.include.push(include);
                    }
                }

                for (const exclude of tsconfig.current.exclude) {
                    if (!created.current.exclude.includes(exclude)) {
                        created.current.exclude.push(exclude);
                    }
                }

                /** Now assign all misc properties that are not already assigned. */

                const otherJson = omit(tsconfig.current, ["extends", "compilerOptions", "include", "exclude"]);

                assign(created.current, otherJson, created.current);

                const otherCompilerOptions = omit(tsconfig.current.compilerOptions, ["paths", "baseUrl"]);

                assign(created.current.compilerOptions, otherCompilerOptions, created.current.compilerOptions);
            }),
        );

        return created;
    }

    static async find(cwd: string, fileName = "tsconfig.json") {
        const foundPath = await findUp(fileName, { cwd: cwd });

        if (!foundPath) {
            throw printAndExit(`> Couldn't find a "${fileName}" in directory or parent directory: "${cwd}".`);
        }

        try {
            let found = new TsconfigFile(JSON.parse(await fs.readFile(foundPath, { encoding: "utf-8" })), path.dirname(foundPath));

            if (found.current.extends) {
                let extendsPath: string;

                if (found.current.extends.charAt(0) !== "/" && found.current.extends.charAt(0) !== ".") {
                    try {
                        extendsPath = require.resolve(found.current.extends);
                    } catch (e) {
                        throw printAndExit(`> Couldn't resolve module: "${found.current.extends}".`);
                    }
                } else {
                    extendsPath = path.resolve(found.cwd, found.current.extends);
                }

                delete found.current.extends;

                if (!found.extends.includes(extendsPath)) {
                    found.extends.push(extendsPath);

                    found = await TsconfigFile.merge(await TsconfigFile.find(path.dirname(extendsPath), path.basename(extendsPath)), found);
                }
            }

            return found.relativize(cwd);
        } catch (e) {
            console.error(e);
            throw printAndExit(`Failed parsing "${fileName}" from: "${foundPath}".`);
        }
    }

    constructor(tsconfig: Partial<TsconfigJson>, cwd: string) {
        this.current = merge({}, defaultTsconfig(), tsconfig);
        this.cwd = cwd;
    }

    /** Assigns a set of tsconfigs to the `Tsconfig`. */
    async assign(...tsconfigs: TsconfigFile[]) {
        const newTsconfig = await TsconfigFile.merge(this, ...tsconfigs);

        this.current = newTsconfig.current;
        this.cwd = newTsconfig.cwd;
        this.extends = newTsconfig.extends;
    }

    /** Make all properties of the current configuration relative to a new `cwd`.
     * If the `cwd` is equal, it will return this same instance. */
    relativize(cwd: string) {
        if (cwd === this.cwd) {
            return this;
        }

        return new TsconfigFile(relativizeTsconfig({ tsconfig: this.current, toCwd: cwd, fromCwd: this.cwd }), cwd);
    }

    /** Relativizes the container baseUr */
    relativizeCompiler(compilerCwd: string) {
        if (path.resolve(this.compilerCwd, compilerCwd) === this.compilerCwd) {
            return this;
        }

        const relativizedCompiler = relativizeTsconfigCompiler({
            tsconfig: this.current,
            toCwd: path.resolve(this.compilerCwd, compilerCwd),
            fromCwd: this.compilerCwd,
        });

        return new TsconfigFile({ ...relativizedCompiler }, this.cwd);
    }

    /** Formats paths correctly. */
    format() {
        formatTsconfig(this.current);
    }

    /** Joins the `<cwd>` with the `<baseUrl>`. */
    get compilerCwd() {
        return path.join(this.cwd, this.current.compilerOptions.baseUrl);
    }

    toJson() {
        return JSON.stringify(this.current, null, "\t");
    }
}
export interface TsconfigJson {
    include: string[];
    exclude: string[];
    compilerOptions: CompilerOptions;

    extends?: string;
}

export interface CompilerOptions {
    baseUrl: string;
    paths: Record<string, string[]>;

    module?: string;
    isolatedModules?: boolean;
    declaration?: boolean;
    allowJs?: boolean;
    noEmit?: boolean;
    jsx?: string;
}

export function defaultTsconfig(): TsconfigJson {
    return {
        compilerOptions: { baseUrl: "./", paths: {} },
        include: [],
        exclude: [],
    };
}

export function formatTsconfig(tsconfig: TsconfigJson) {
    tsconfig.include = tsconfig.include.map((include) => {
        if (include.charAt(0) !== "." && include.charAt(0) !== "*") {
            return `./${include}`;
        } else {
            return include;
        }
    });

    tsconfig.exclude = tsconfig.exclude.map((exclude) => {
        if (exclude.charAt(0) !== "." && exclude.charAt(0) !== "*") {
            return `./${exclude}`;
        } else {
            return exclude;
        }
    });

    return tsconfig;
}

export function relativizeTsconfig(props: RelativizeProps) {
    const newJson = defaultTsconfig();

    Object.keys(props.tsconfig.compilerOptions.paths).forEach((pathKey) => {
        newJson.compilerOptions.paths[pathKey] = props.tsconfig.compilerOptions.paths[pathKey].map((pathTarget) =>
            path.join(path.relative(props.toCwd, path.join(props.fromCwd, props.tsconfig.compilerOptions.baseUrl)), pathTarget),
        );
    });

    if (props.tsconfig.extends && props.tsconfig.extends.charAt(0) === ".") {
        newJson.extends = path.join(path.relative(props.toCwd, props.fromCwd), props.tsconfig.extends);
    }

    newJson.include = props.tsconfig.include.map((include) => {
        if (!(include.charAt(0) === "*" ? include.charAt(1) === "*" : false)) {
            return path.join(path.relative(props.toCwd, props.fromCwd), include);
        } else {
            return include;
        }
    });

    newJson.exclude = props.tsconfig.exclude.map((exclude) => {
        if (!(exclude.charAt(0) === "*" ? exclude.charAt(1) === "*" : false)) {
            return path.join(path.relative(props.toCwd, props.fromCwd), exclude);
        } else {
            return exclude;
        }
    });

    const otherJson = omit(props.tsconfig, ["extends", "compilerOptions", "include", "exclude"]);
    const otherCompilerOptions = omit(props.tsconfig.compilerOptions, ["paths"]);

    assign(newJson, otherJson);
    assign(newJson.compilerOptions, otherCompilerOptions);

    return newJson;
}

export function relativizeTsconfigCompiler(props: RelativizeProps) {
    const newJson: TsconfigJson = {
        ...props.tsconfig,
        compilerOptions: {
            ...props.tsconfig.compilerOptions,
            paths: { ...props.tsconfig.compilerOptions.paths },
        },
    };

    newJson.compilerOptions.baseUrl = path.join(props.tsconfig.compilerOptions.baseUrl, path.relative(props.fromCwd, props.toCwd));

    Object.keys(props.tsconfig.compilerOptions.paths).forEach((pathKey) => {
        newJson.compilerOptions.paths[pathKey] = props.tsconfig.compilerOptions.paths[pathKey].map((pathTarget) =>
            path.join(path.relative(props.toCwd, props.fromCwd), pathTarget),
        );
    });

    return {
        ...newJson,
        compilerOptions: {
            ...newJson.compilerOptions,
            paths: { ...newJson.compilerOptions.paths },
        },
    };
}

export interface RelativizeProps {
    fromCwd: string;
    toCwd: string;
    tsconfig: TsconfigJson;
}
