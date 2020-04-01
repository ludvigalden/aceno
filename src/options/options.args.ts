import arg from "arg";

import { AcenoRC } from "./options.result";

export interface OptionsArgSpec extends arg.Spec {
    // Types
    "--cwd": arg.Handler<string>;
    "--extend": [arg.Handler<string>];
    "--env": [arg.Handler<string>];
    "--tsconfig": arg.Handler<string>;
    "--id": arg.Handler<string>;
    "--dev": arg.Handler<boolean>;

    // Aliases
    "-e": "--extend";
    "-tc": "--tsconfig";
    "-i": "--id";
    "-d": "--dev";
}

export interface OptionsArgResult {
    /** Working directory to use relative to the `process.cwd()`. */
    "--cwd"?: string;
    /** Relative directories to extend configurations from (should not include the `.acenorc` part). */
    "--extend"?: string[];
    /** Assign `process.env` variables by either  */
    "--env"?: string[];
    /** The location of the `tsconfig.json` relative to the `cwd`. */
    "--tsconfig"?: string;
    /** The identifier to use for the instance, e.g. for identifying builds. */
    "--id"?: string;
    /** Whether the `NODE_ENV` should be set to `"development"`. */
    "--dev"?: boolean;

    /** Arguments that could not be matched. */
    _: string[];
}

export const optionsArgSpec: OptionsArgSpec = {
    "--cwd": String,
    "--config": [String],
    "--extend": [String],
    "--env": [String],
    "--tsconfig": String,
    "--id": String,
    "--dev": Boolean,

    // Aliases
    "-c": "--config",
    "-e": "--extend",
    "-tc": "--tsconfig",
    "-i": "--id",
    "-d": "--dev",
    "-pd": "--pkgdev",
    "-prp": "--pkgrepoPath",
};

export const optionArgs: OptionsArgResult = arg<OptionsArgSpec>(optionsArgSpec, {
    permissive: true,
});

export const runtimeArgsConfig: Partial<AcenoRC> = {};

if (optionArgs["--cwd"]) {
    runtimeArgsConfig.cwd = optionArgs["--cwd"];
}

if (optionArgs["--extend"]) {
    runtimeArgsConfig.extend = optionArgs["--extend"];
}

if (optionArgs["--env"]) {
    runtimeArgsConfig.env = optionArgs["--env"];
}

if (optionArgs["--tsconfig"]) {
    runtimeArgsConfig.tsconfig = optionArgs["--tsconfig"];
}

if (optionArgs["--id"]) {
    runtimeArgsConfig.id = optionArgs["--id"];
}

if (optionArgs["--dev"]) {
    runtimeArgsConfig.dev = optionArgs["--dev"];
}
