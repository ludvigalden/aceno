import envalid from "envalid";

import { Options } from "../options";

import { resolveEnvPath, loadEnv } from "./env.load";
import { setEnv } from "./env.set";
import { envSpec, EnvValidatorSpec } from "./env.spec_";

class Env {
    spec: typeof envSpec = envSpec;

    private validatedKeys = new Set<keyof NodeJS.ProcessEnv>();
    private sharedKeys = new Set<keyof NodeJS.ProcessEnv>();
    private _loading = new Map<string, Promise<void>>();
    private _loaded = new Set<string>();

    private _promise: Promise<void>;

    get current() {
        return process.env;
    }

    get shared() {
        const env: Partial<NodeJS.ProcessEnv> = {};

        Array.from(this.sharedKeys).forEach((key) => {
            if (this.current[key] !== undefined) {
                env[key] = this.current[key];
            }
        });

        return env;
    }

    get promise() {
        if (!this._promise) {
            this._promise = new Promise(async (resolve) => {
                await setEnv(process.env, Options.cwd);

                if (Options.current.env) {
                    await Promise.all(Options.current.env.map((_env) => this.load(_env)));
                }

                await Options.promise;

                if (Options.current.env) {
                    await Promise.all(Options.current.env.map((_env) => this.load(_env)));
                }

                resolve();
            });
        }

        return this._promise;
    }

    get<K extends keyof NodeJS.ProcessEnv>(key: K): NodeJS.ProcessEnv[K] {
        if (!this.validatedKeys.has(key)) {
            console.warn(`Variable "${key}" should be validated before being retrieved!`);
        }

        return this.current[key];
    }

    /** Check whether a `process["e" + "nv"]` variable has been validated and parsed. */
    has(key: keyof NodeJS.ProcessEnv) {
        return this.validatedKeys.has(key);
    }

    /** Validate and set `process["e" + "nv"]` variables using `envSpec`.  */
    set(env: { [K in keyof NodeJS.ProcessEnv]?: EnvValidatorSpec<NodeJS.ProcessEnv[K]> }): this;
    /** Validate and set a single `process["e" + "nv"]` variables using `envSpec`.  */
    set<K extends keyof NodeJS.ProcessEnv>(key: K, spec: EnvValidatorSpec<NodeJS.ProcessEnv[K]>): this;
    set(...args: any[]) {
        const env: { [K in keyof NodeJS.ProcessEnv]: EnvValidatorSpec<NodeJS.ProcessEnv[K]> } =
            args.length === 1 ? args[0] : { [args[0]]: args[1] };

        (Object.keys(env) as (keyof NodeJS.ProcessEnv)[]).forEach((key) => {
            const spec = env[key];

            if (spec && spec.value != null) {
                this.assign(key, spec.value);
            }
        });

        this.assign(
            envalid.cleanEnv(this.current, env, {
                strict: true,
                dotEnvPath: null,
            }),
        );

        Object.keys(env).forEach((validated) => {
            this.validatedKeys.add(validated as any);

            if (env[validated].shared) {
                this.sharedKeys.add(validated as any);
            }
        });

        return this;
    }

    assign<K extends keyof NodeJS.ProcessEnv>(key: K, value: NodeJS.ProcessEnv[K]): void;
    assign(env: Partial<NodeJS.ProcessEnv>): void;
    assign(...args: any[]) {
        if (args.length === 1) {
            const env = args[0] as Partial<NodeJS.ProcessEnv>;

            Object.keys(env).forEach((key) => {
                if (env[key] !== undefined) {
                    this.current[key] = env[key];
                }
            });
        } else {
            if (args[1] !== undefined) {
                this.current[args[0]] = args[1];
            }
        }
    }

    async load(env: string) {
        const envPath = await resolveEnvPath(env);

        if (this._loaded.has(envPath)) {
            return;
        }

        if (!this._loading.has(envPath)) {
            this._loading.set(
                envPath,
                new Promise<void>(async (resolve) => {
                    resolve(loadEnv(envPath));
                }).then(() => {
                    this._loading.delete(envPath);
                    this._loaded.add(envPath);
                }),
            );
        }

        return this._loading.get(envPath);
    }
}

const E = new Env();
export { E as Env };
