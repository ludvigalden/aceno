import path from "path";

import fs from "fs-extra";
import globby from "globby";

/** Finds all immediate files in a directory, e.g. `<cwd>/<name>.ts` or `<cwd>/<name>/index.js`,
 * and maps the absolute paths of those files to their name, like `Map<name, path>`. */
export async function findImmediateFiles(cwd: string) {
    const found = new Map<string, string>();

    if (await fs.pathExists(cwd)) {
        const filePaths: string[] = await globby(
            ["*.{ts,tsx,js,jsx}", "*/index.{ts,tsx,js,jsx}"].map((pattern) => path.join(cwd, pattern)),
        );

        for (const filePath of filePaths) {
            if (filePath.includes("d.ts")) {
                continue;
            }

            const fileName = filePath
                .split(cwd)
                .join("")
                .split("/index")
                .join("")
                .split("/")
                .join("")
                .split(".tsx")
                .join("")
                .split(".ts")
                .join("")
                .split(".jsx")
                .join("")
                .split(".js")
                .join("");

            if (fileName !== "") {
                found.set(fileName, filePath);
            }
        }
    }

    return found;
}
