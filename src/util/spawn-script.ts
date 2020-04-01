import path from "path";

import execa, { Options as ExecaOptions } from "execa";

interface SpawnOptions extends ExecaOptions {
    /** If a `--cwd` argument should be passed. */
    cwd?: string;
    /** Whether to inherit options from the `process.argv`. */
    inherit?: boolean;
}

const ACENO = "aceno";

export async function spawnScript(script: string, options: SpawnOptions = {}) {
    const scriptArgv = script.split(" ");

    if (scriptArgv.includes(ACENO) || scriptArgv.find((_argv) => _argv.includes(ACENO + ".ts") || _argv.includes(ACENO + ".js"))) {
        const spawnedTifumArgv: string[] = [];
        let foundTifumFileEnd = false;

        while (!foundTifumFileEnd && process.argv.length > spawnedTifumArgv.length) {
            const arg = process.argv[spawnedTifumArgv.length];

            spawnedTifumArgv.push(arg);

            /** Check if the call was either "ts-node aceno.ts", "aceno", or "yarn aceno"
             * and push all arguments before that to use */
            if (arg.includes(ACENO) && !arg.includes("ts-node") && !arg.includes("node")) {
                foundTifumFileEnd = true;
            }
        }

        const parsedArgv = [
            ...spawnedTifumArgv,
            ...scriptArgv.filter(
                (scriptArg) =>
                    scriptArg !== ACENO &&
                    !scriptArg.includes("yarn") &&
                    !scriptArg.includes(ACENO + ".ts") &&
                    !scriptArg.includes(ACENO + ".js") &&
                    !scriptArg.includes("ts-node") &&
                    !scriptArg.includes("node"),
            ),
        ];

        if (options.cwd) {
            parsedArgv.push("--cwd", path.relative(process.cwd(), path.resolve(process.cwd(), options.cwd)));
        }

        if (options.inherit) {
            parsedArgv.push(
                ...process.argv.filter((_argv) => {
                    if (_argv.charAt(0) === "-") {
                        const option: string = _argv.includes("=") ? _argv.split("=")[0] : _argv;

                        if (!parsedArgv.includes(option)) {
                            return true;
                        }
                    }

                    return false;
                }),
            );
        }

        const [execaFile, ...execaArgv] = parsedArgv;

        await execa(execaFile, execaArgv, {
            stdio: "inherit",
            ...options,
            cwd: process.cwd(),
        });
    } else {
        const parsedArgv = [...scriptArgv];

        if (options.cwd) {
            parsedArgv.push("--cwd", path.relative(process.cwd(), path.resolve(process.cwd(), options.cwd)));
        }

        const [execaFile, ...execaArgv] = parsedArgv;

        await execa(execaFile, execaArgv, {
            stdio: "inherit",
            ...options,
            cwd: process.cwd(),
        });
    }
}
