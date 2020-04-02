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
    if (script.includes("&&")) {
        return Promise.resolve().then(async () => {
            const scripts = script.split("&&");
            let i = 0;

            while (i <= scripts.length - 1) {
                if (scripts[i].charAt(0) === " ") {
                    scripts[i] = scripts[i].slice(1);
                }

                await spawnScript(scripts[i], options);

                i++;
            }
        });
    }

    const scriptArgv = script.split(" ");

    if (
        scriptArgv.includes(ACENO) ||
        scriptArgv.includes("node") ||
        scriptArgv.includes("ts-node") ||
        scriptArgv.find((_argv) => _argv.includes(ACENO + ".ts") || _argv.includes(ACENO + ".js"))
    ) {
        const spawnedAcenoArgv: string[] = [];
        let foundAcenoFileEnd = false;

        while (!foundAcenoFileEnd && process.argv.length > spawnedAcenoArgv.length) {
            const arg = process.argv[spawnedAcenoArgv.length];

            spawnedAcenoArgv.push(arg);

            /** Check if the call was either "ts-node aceno.ts", "aceno", or "yarn aceno"
             * and push all arguments before that to use */
            if (arg.includes(ACENO) && !arg.includes("ts-node") && !arg.includes("node")) {
                foundAcenoFileEnd = true;
            }
        }

        const parsedArgv = [
            ...spawnedAcenoArgv,
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
            const relativeCwd = path.relative(process.cwd(), path.resolve(process.cwd(), options.cwd));

            if (relativeCwd) {
                parsedArgv.push("--cwd", path.relative(process.cwd(), path.resolve(process.cwd(), options.cwd)));
            }
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

        const [execaFile, ...execaArgv] = parsedArgv;

        await execa(execaFile, execaArgv, {
            stdio: "inherit",
            shell: true,
            ...options,
            cwd: options.cwd ? path.resolve(process.cwd(), options.cwd) : process.cwd(),
        });
    }
}
