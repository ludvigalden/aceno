import arg from "arg";

import { OptionsArgSpec, OptionsArgResult } from "../options/options.args";

export interface ArgSpec extends arg.Spec, aceno.ArgSpec, OptionsArgSpec {
    // Types
    "--help": arg.Handler<boolean>;

    // Aliases
    "-h": "--help";
}

export interface ArgResult extends aceno.ArgResult, OptionsArgResult {
    "--help"?: boolean;
}

declare global {
    namespace aceno {
        interface ArgSpec extends arg.Spec {}
        // eslint-disable-next-line @typescript-eslint/no-empty-interface
        interface ArgResult {}
    }
}

export interface HelpInfo {
    /** Describe the option. */
    description?: string;
    /** If the option has a prefix, e.g. `-h` for `--help`. */
    prefix?: keyof ArgSpec;
    /** If the script should not be shown in the console. */
    hidden?: boolean;
    /** If the script should not be shown for child scripts. */
    local?: boolean;
}
