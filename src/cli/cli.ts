import arg from "arg";
import isEqual from "lodash-es/isEqual";
import merge from "lodash-es/merge";

import { printAndExit } from "../util";

import { ArgSpec, ArgResult, HelpInfo } from "./cli.types";
import { CONSOLE_INDENT, CONSOLE_SCRIPT_PREFIX } from "./cli.constants";
import { ScriptMap, Script } from "./cli.script";

class Cli {
    private _spec: ArgSpec;

    /** The names of the registered scripts. */
    private _names: string[] = [];
    /** Describe the script */
    private _description?: string;
    /** Allowed sub-scripts. */
    private _scripts?: string[];
    /** Specify usage of the script. If `scripts` are defined, this will be generated automatically. */
    private _usage?: string;
    /** Serving more information for the options available. */
    private _info: { [K in keyof ArgSpec]?: HelpInfo } = {};

    constructor() {
        this.register("aceno")
            .spec({
                "--cwd": String,
                "--config": [String],
                "--extend": [String],
                "--env": [String],
                "--tsconfig": String,
                "--id": String,
                "--dev": Boolean,
                "--help": Boolean,

                // Aliases
                "-c": "--config",
                "-e": "--extend",
                "-tc": "--tsconfig",
                "-i": "--id",
                "-h": "--help",
            })
            .info({
                "--config": {
                    prefix: "-c",
                    description: "Specify the path to the configuration entrypoint",
                },
                "--tsconfig": {
                    prefix: "-tc",
                    description: "Relative path to the tsconfig.json file",
                },
                "--cwd": {
                    hidden: true,
                },
                "--dev": {
                    hidden: true,
                    prefix: "-d",
                    description: 'Set the NODE_ENV to "development"',
                },
                "--env": {
                    hidden: true,
                    prefix: "-e",
                    description: "Path to a .env file to import",
                },
                "--name": {
                    prefix: "-n",
                    description: "Specify the identifier for dist directories etc.",
                },
                "--version": {
                    hidden: true,
                    prefix: "-v",
                    description: "The current version of aceno",
                },
                "--help": {
                    prefix: "-h",
                    description: "Displays this message",
                },
            });
    }

    /** Registers a new `Script` to be in progress. */
    register(name: string) {
        this._names.push(name);

        // delete props specific to each script
        delete this._description;
        delete this._usage;
        delete this._scripts;

        if (this.result && this.result._[0] === this._names[this._names.length - 1]) {
            this.result._ = this.result._.slice(1, this.result._.length);
        }

        return this;
    }

    spec(spec: Partial<ArgSpec>) {
        if (!this._spec) {
            this._spec = spec as any;
            this.hydrateOptions();
            return this;
        }

        const modified: (keyof ArgSpec)[] = [];

        Object.keys(spec).forEach((specKey) => {
            if (!this._spec[specKey] || !isEqual(this._spec[specKey], spec[specKey])) {
                this._spec[specKey] = spec[specKey] as any;
                modified.push(specKey);
            }
        });

        if (modified.length) {
            this.hydrateOptions();
        }

        return this;
    }

    info(info: { [K in keyof ArgSpec]?: HelpInfo }) {
        merge(this._info, info);

        return this;
    }

    description(description: string) {
        this._description = description;

        return this;
    }

    usage(usage: string) {
        this._usage = usage;

        return this;
    }

    scripts(scripts: Iterable<string> | ScriptMap | Map<string, any>) {
        this._scripts =
            scripts instanceof ScriptMap
                ? scripts.names()
                : scripts instanceof Map
                ? [...scripts.keys()].sort((a, b) => a.localeCompare(b))
                : [...scripts].sort((a, b) => a.localeCompare(b));

        return this;
    }

    /** Spawn a `Script` using either an absolute path to where it is exported. */
    async spawn(script: string | object | Script | undefined) {
        let cliScript: Script | undefined;

        if (typeof script === "function") {
            cliScript = script as any;
        } else {
            let foundExports: any;

            if (typeof script === "string") {
                foundExports = await import(script);
            } else if (typeof script === "object") {
                foundExports = script;
            }

            if (foundExports) {
                if (foundExports.default && typeof foundExports.default === "function") {
                    cliScript = foundExports.default;
                } else {
                    const foundFunctionExport = Object.keys(foundExports).find(
                        (exportName) => typeof foundExports[exportName] === "function",
                    );

                    if (foundFunctionExport) {
                        cliScript = foundExports[foundFunctionExport];
                    }
                }
            }
        }

        if (!cliScript) {
            throw new Error(`Could not spawn script: ${script}`);
        }

        return cliScript();
    }

    printHelp(): void {
        const blocks: string[] = [];

        if (this._usage) {
            blocks.push("Usage\n" + CONSOLE_INDENT + CONSOLE_SCRIPT_PREFIX + this._usage);
        } else if (this._scripts) {
            blocks.push("Usage\n" + (CONSOLE_INDENT + CONSOLE_SCRIPT_PREFIX + this._names.join(" ") + " <script>"));
        }

        if (this._description) {
            blocks.push("Description\n" + CONSOLE_INDENT + this._description);
        }

        if (this._scripts && this._scripts.length > 0) {
            blocks.push("Available scripts\n" + (CONSOLE_INDENT + this._scripts.join(", ")));
        }

        const optionBlocks: { argKey: keyof ArgResult & string; optionKey: string }[] = [];

        (Object.keys(this._info) as (keyof ArgResult & string)[]).forEach((argKey) => {
            if (argKey.includes("--")) {
                const info = this._info[argKey];

                if (info && !info.hidden) {
                    optionBlocks.push({
                        argKey,
                        optionKey: `${argKey}${info.prefix ? `, ${info.prefix}` : ""}`,
                    });
                }
            }
        });

        const maxOptionKeyLength = Math.max(...optionBlocks.map((optionKey) => optionKey.optionKey.length));

        const options: string[] = [];

        optionBlocks.forEach(({ argKey, optionKey }) => {
            const info = this._info[argKey];

            if (info) {
                const descriptionPrefix = info.description
                    ? Array(maxOptionKeyLength - optionKey.length + CONSOLE_INDENT.length)
                          .fill(" ")
                          .join("")
                    : "";

                const descriptionAddLinePrefix = info.description
                    ? Array(maxOptionKeyLength + CONSOLE_INDENT.length + CONSOLE_INDENT.length)
                          .fill(" ")
                          .join("")
                    : "";

                const maxDescriptionLineLength =
                    process.stdout.columns - maxOptionKeyLength - CONSOLE_INDENT.length - CONSOLE_INDENT.length;

                const descriptionLines = info.description
                    ? info.description.match(new RegExp(`.{1,${maxDescriptionLineLength}}`)) || []
                    : [];

                const option = info.description
                    ? optionKey + descriptionPrefix + descriptionLines.join("\n" + descriptionAddLinePrefix)
                    : optionKey;

                options.push(CONSOLE_INDENT + option + (descriptionLines.length > 1 ? "\n" : ""));
            }
        });

        if (options.length > 0) {
            blocks.push("Options\n" + options.join("\n"));
        }

        if (this._scripts && this._scripts.length > 0) {
            blocks.push(
                "For info about specific scripts\n" + (CONSOLE_INDENT + CONSOLE_SCRIPT_PREFIX + this._names.join(" ") + " <script> --help"),
            );
        }

        return printAndExit("\n" + blocks.join("\n\n") + "\n", this.result["--help"] ? 0 : 1);
    }

    script(script: Script) {
        return script;
    }

    private hydrateOptions() {
        this.result = arg<ArgSpec>(this._spec, {
            permissive: true,
            argv: this.result && this.result._,
        }) as any;
    }

    result: ArgResult;

    get argv() {
        return this.result._;
    }
}

/** Allows for chaining methods for configuring the cli. */
const C = new Cli();

export { C as Cli };
