import path from "path";

import fs from "fs-extra";

import { AcenoRC } from "./options.result";
import { Options } from "./options";

const loaded: string[] = [];

export async function setOptionsFromFile(props: OptionsFromFileProps) {
    const cwd = props.cwd || Options.cwd;

    if (loaded.includes(cwd)) {
        return;
    }

    loaded.push(cwd);

    const filePath = await resolveOptionsFilePath(cwd).catch(() => undefined);

    if (!filePath) {
        return;
    }

    const fileExtension = path.extname(filePath);

    let found: AcenoRC | undefined;

    if (fileExtension === "" || fileExtension === ".json") {
        found = JSON.parse(await fs.readFile(filePath, { encoding: "utf-8" }));
    } else if (fileExtension === ".js" || fileExtension === ".ts") {
        found = await import(filePath).then((i) => i.default || i);
    }

    if (!found) {
        return;
    }

    if (cwd !== Options.cwd) {
        if (found.env) {
            found.env = found.env.map((env) => (typeof env === "string" ? path.relative(path.join(cwd, env), Options.cwd) : env));
        }

        // note that found.extends is not relativized since it's handled below using to the right <cwd>
    }

    if (found.extend) {
        const foundExtends = found.extend;

        delete found.extend;

        await Promise.all(
            foundExtends.map(async (extendsPath) =>
                setOptionsFromFile({
                    cwd: path.join(cwd, extendsPath),
                    extended: true,
                }),
            ),
        );
    }

    if (props.extended) {
        // cwds can't be set by extended configs
        if (found.cwd) {
            delete found.cwd;
        }
    }

    Options.set(found);

    if (Options.current.extend) {
        const extendsList: string[] = Array.isArray(Options.current.extend) ? Options.current.extend : [Options.current.extend];

        delete Options.current.extend;

        await Promise.all(
            extendsList.map(async (extendsPath) =>
                setOptionsFromFile({
                    cwd: path.join(cwd, extendsPath),
                    extended: true,
                }),
            ),
        );
    }
}

const fileName = ".acenorc";
const extensions = ["", ".json", ".ts", ".js"];

async function resolveOptionsFilePath(cwd: string) {
    let toResolve: string[];
    let error: string;

    if (await fs.pathExists(cwd)) {
        const name = path.basename(cwd);
        const nameFile = fileName + "." + name;
        const nameCwd = cwd.split("/" + name).join("");

        toResolve = [
            ...extensions.map((ext) => path.join(cwd, fileName + ext)),
            ...extensions.map((ext) => path.join(nameCwd, nameFile + ext)),
        ];

        error = `Could not find a "${nameFile}" in the <cwd> or a "${fileName}" in the <cwd>/${name}`;
    } else {
        const name = path.basename(cwd);
        const nameFile = fileName + "." + name;
        const nameCwd = cwd.split("/" + name).join("");

        toResolve = extensions.map((ext) => path.join(nameCwd, nameFile + ext));

        error = `Could not find a "${nameFile}" in the parent directory`;
    }

    let existing: string | undefined;

    await Promise.all(
        toResolve.map(async (toResolvePath) => {
            if (!existing && (await fs.pathExists(toResolvePath))) {
                existing = toResolvePath;
            }
        }),
    );

    if (!existing) {
        throw new Error(error);
    }

    return existing;
}

export interface OptionsFromFileProps {
    /** The directory to import files from. */
    cwd?: string;
    extended?: boolean;
}
