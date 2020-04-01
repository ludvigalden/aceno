import fs from "fs-extra";

import { findImmediateFiles } from "../util";

import { Cli } from "./cli";

export class ScriptMap extends Map<string, () => Promise<void>> {
    /** Sorts the scripts alphabetically. */
    sort() {
        return new Map([...this.entries()].sort(([scriptNameA], [scriptNameB]) => scriptNameA.localeCompare(scriptNameB)));
    }

    names() {
        return [...this.sort().keys()];
    }
}

export async function findScripts(cliDirectory: string): Promise<ScriptMap> {
    const found = new ScriptMap();

    if (await fs.pathExists(cliDirectory)) {
        const foundFiles = await findImmediateFiles(cliDirectory);
        for (const scriptName of [...foundFiles.keys()]) {
            found.set(scriptName, async () => Cli.spawn(foundFiles.get(scriptName)));
        }
    }

    found.sort();

    return found;
}

export interface Script {
    (): Promise<void> | void;
}
