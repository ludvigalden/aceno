#!/usr/bin/env node
import { ScriptMap, Cli, findScripts } from "../cli";
import { Options } from "../options";
import { Tsconfig } from "../file";

export async function aceno() {
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
        console.info(`\nNot found: "aceno ${scriptName}"`);
        return Cli.printHelp();
    }

    return script();
}

aceno();
