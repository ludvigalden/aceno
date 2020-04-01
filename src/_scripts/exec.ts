import { basename, dirname, resolve } from "path";

import { spawnScript } from "../util";
import { Cli } from "../cli";
import { Options } from "../options";
import { Package } from "../file";

const exec = Cli.script(async function exec() {
    Cli.register("exec")
        .description("Execute a file")
        .usage("aceno exec <path>");

    const path = Cli.argv[0];

    if (Cli.result["--help"] || !path) {
        return Cli.printHelp();
    }

    let foundFile: string | undefined;

    try {
        foundFile = require.resolve(resolve(Options.cwd, path));
    } catch (error) {}

    if (foundFile) {
        console.info(`> Executing "${basename(foundFile)}" in "${dirname(foundFile)}"`);

        return import(foundFile);
    }

    const packageFile = Package.current;

    if (packageFile && packageFile.scripts && packageFile.scripts[path]) {
        console.info(`> Running "${path}" for "${packageFile.name}"`);

        await spawnScript(packageFile.scripts[path], {
            inherit: true,
            cwd: Options.cwd,
        });
    }

    console.info(`> Couldn't find anything to execute for "${path}"`);
});

export default exec;
