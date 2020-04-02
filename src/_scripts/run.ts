import { basename, dirname, resolve } from "path";

import { spawnScript } from "../util";
import { Cli } from "../cli";
import { Options } from "../options";
import { Package } from "../file";

export default Cli.script(async function run() {
    Cli.register("run")
        .description("Run a script or execute a file")
        .usage("aceno run <script>");

    const path = Cli.argv[0];

    if (Cli.result["--help"] || !path) {
        return Cli.printHelp();
    }

    let foundFile: string | undefined;

    try {
        foundFile = require.resolve(resolve(Options.cwd, path));
    } catch (error) {
        try {
            foundFile = require.resolve(path);
        } catch (error) {}
    }

    if (foundFile) {
        console.info(`> Executing "${basename(foundFile)}" in "${dirname(foundFile)}"`);

        return import(foundFile);
    }

    const packageFile = await Package.promise.then(() => Package.current);

    if (packageFile && packageFile.scripts && packageFile.scripts[path]) {
        console.info(`> Running "${path}" for "${packageFile.name}"`);

        await spawnScript(packageFile.scripts[path], {
            inherit: true,
            cwd: Options.cwd,
        });
    } else {
        await spawnScript(Cli.argv.join(" "), {
            inherit: true,
            cwd: Options.cwd,
        });
    }
});
