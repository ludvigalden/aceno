import path from "path";

import fs from "fs-extra";
import dotenv from "dotenv";

import { Options } from "../options";

import { setEnv } from "./env.set";

const loadedEnv: string[] = [];

export async function loadEnv(envPath: string) {
    if (loadedEnv.includes(envPath)) {
        return;
    } else {
        loadedEnv.push(envPath);
    }

    await setEnv(dotenv.parse(envPath), path.dirname(envPath));
}

export async function resolveEnvPath(env: string) {
    const trueEnv = path.resolve(Options.cwd, env);

    let toResolve: string[];
    let error: string;

    if (await fs.pathExists(trueEnv)) {
        toResolve = [path.join(trueEnv, ".env"), path.join(path.dirname(trueEnv), ".env." + path.basename(trueEnv))];

        error = `Could not find a .env file at "<cwd>/.env" or "<cwd>/../${".env." + path.basename(trueEnv)}"`;
    } else {
        toResolve = [path.join(path.dirname(trueEnv), ".env." + path.basename(trueEnv))];

        error = `Could not find a .env file at "<cwd>/../${".env." + path.basename(trueEnv)}"`;
    }

    let found: string | undefined;

    await Promise.all(
        toResolve.map(async (toResolvePath) => {
            if (!found && (await fs.pathExists(toResolvePath))) {
                found = toResolvePath;
            }
        }),
    );

    if (!found) {
        throw new Error(error);
    }

    return found;
}
