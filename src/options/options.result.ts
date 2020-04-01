export interface AcenoRC {
    /** The working directory to use relative to the `process.cwd()`. */
    cwd?: string;
    /** Relative directories to extend configurations from (should not include the `.acenorc` part). */
    extend?: string[];
    /** Relative directories where scripts should be resolved. Always looks for "<cwd>/_scripts". */
    scripts?: string[];
    /** Assign `process.env` variables by either  */
    env?: string[];
    /** The location of the `tsconfig.json` relative to the `cwd`. */
    tsconfig?: string;
    /** The identifier to use for the instance, e.g. for identifying builds. */
    id?: string;
    /** Whether the `NODE_ENV` should be set to `"development"`. */
    dev?: boolean;
    /** Whether the runtime is for testing if the runtime works. */
    testing?: boolean;
}
