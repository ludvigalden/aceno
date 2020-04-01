import { spawnScript } from "../util";
import { Cli } from "../cli";
import { Package } from "../file";
import { Options } from "../options";

const run = Cli.script(async function run() {
    Cli.register("run")
        .description("Run a script from the package.json")
        .usage("aceno run <script>");

    const script = Cli.argv[0];

    if (Cli.result["--help"] || !script) {
        return Cli.printHelp();
    }

    const packageFile = Package.current;

    if (packageFile && packageFile.scripts && packageFile.scripts[script]) {
        console.info(`> Running "${script}" for "${packageFile.name}"`);

        await spawnScript(packageFile.scripts[script], {
            inherit: true,
            cwd: Options.cwd,
        });
    }
});

export default run;
