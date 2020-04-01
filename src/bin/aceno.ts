#!/usr/bin/env node
import { initAceno } from "../aceno.init";
import { ScriptMap, Cli, findScripts } from "../cli";
import { Options } from "../options";

export async function aceno() {
    await initAceno();

    const scriptMap = await new Promise<Map<string, () => Promise<void>>>(async (resolve) => {
        const found = new ScriptMap();

        const scripts = await Options.promise.then(() => Options.current.scripts || []);

        await Promise.all(
            scripts.map(async (dir) => {
                const foundMap = await findScripts(dir);

                foundMap.forEach((script, scriptName) => {
                    if (!found.has(scriptName)) {
                        found.set(scriptName, script);
                    }
                });
            }),
        );

        found.sort();

        resolve(found);
    });

    Cli.scripts(scriptMap);

    const scriptName = Cli.argv[0];

    const script = scriptMap.get(scriptName);

    if (!scriptName || !script) {
        return Cli.printHelp();
    }

    return script();
}

aceno();
