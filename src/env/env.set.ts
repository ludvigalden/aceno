import path from "path";

import words from "lodash-es/words";

import { Options } from "../options";
import { AcenoRC } from "../options/options.result";

import { Env } from "./env";

export async function setEnv(env: Partial<NodeJS.ProcessEnv>, cwd: string = Options.cwd) {
    const runtimeConfigEnv: Partial<AcenoRC> = {};

    if (env.CWD) {
        runtimeConfigEnv.cwd = Env.set("CWD", Env.spec.str({ value: env.CWD })).get("CWD");
    }

    if (env.EXTEND) {
        runtimeConfigEnv.extend = (Env.set("EXTEND", Env.spec.str({ value: env.EXTEND })).get("EXTEND") as string).split(",");
    }

    if (env.TSCONFIG) {
        runtimeConfigEnv.tsconfig = Env.set("TSCONFIG", Env.spec.str({ value: env.TSCONFIG })).get("TSCONFIG");
    }

    if (env.ID) {
        runtimeConfigEnv.id = Env.set("ID", Env.spec.str({ value: env.ID })).get("ID");
    }

    if (env.DEV != null) {
        runtimeConfigEnv.dev = Env.set("DEV", Env.spec.bool({ value: env.DEV as boolean })).get("DEV");
    }

    if (Object.keys(runtimeConfigEnv).length > 0) {
        Options.set(runtimeConfigEnv);
    }

    if (env.ENV) {
        await Promise.all(words(env.ENV).map((_env) => Env.load(path.resolve(cwd, _env))));
    }
}

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            /** The working directory to use relative to the `process.cwd()`. */
            CWD?: string;
            /** Relative directories to extend configurations from (should not include the `.acenorc` part).  */
            EXTEND?: string;
            /** Relative .env files to import. */
            ENV?: string;
            /** The location of the `tsconfig.json` relative to the `cwd`. */
            TSCONFIG?: string;
            /** The identifier to use for the instance, e.g. for identifying builds. */
            ID?: string;
            /** Whether the `NODE_ENV` should be set to `"development"`. */
            DEV?: boolean;
        }
    }
}
