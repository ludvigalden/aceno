import { Options } from "./options";
import { Tsconfig } from "./file";

export async function initAceno() {
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
}
