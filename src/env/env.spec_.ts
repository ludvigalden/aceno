import envalid, { ValidatorSpec as EnvalidValidatorSpec, Spec as EnvalidSpec } from "envalid";

export const envSpec: spec = {
    bool(spec?: EnvSpec<boolean>): EnvValidatorSpec<boolean> {
        return parseEnvSpec("bool", spec);
    },

    num(spec?: EnvSpec<number>): EnvValidatorSpec<number> {
        return parseEnvSpec("num", spec);
    },

    str(spec?: EnvSpec<string>): EnvValidatorSpec<string> {
        return parseEnvSpec("str", spec);
    },

    json(spec?: EnvSpec<any>): EnvValidatorSpec<any> {
        return parseEnvSpec("json", spec);
    },

    url(spec?: EnvSpec<string>): EnvValidatorSpec<string> {
        return parseEnvSpec("url", spec);
    },

    email(spec?: EnvSpec<string>): EnvValidatorSpec<string> {
        return parseEnvSpec("email", spec);
    },

    host(spec?: EnvSpec<string>): EnvValidatorSpec<string> {
        return parseEnvSpec("host", spec);
    },

    port(spec?: EnvSpec<number>): EnvValidatorSpec<number> {
        return parseEnvSpec("port", spec);
    },
};

interface spec {
    /**
     * Parses env var string "0", "1", "true", "false", "t", "f" into Boolean.
     */
    bool(spec?: EnvSpec<boolean>): EnvValidatorSpec<boolean>;
    /**
     * Parses an env var (eg. "42", "0.23", "1e5") into a Number.
     */
    num(spec?: EnvSpec<number>): EnvValidatorSpec<number>;
    /**
     * Passes string values through, will ensure an value is present unless a default value is given.
     */
    str(spec?: EnvSpec<string>): EnvValidatorSpec<string>;
    /**
     * Parses an env var with JSON.parse.
     */
    json(spec?: EnvSpec<any>): EnvValidatorSpec<any>;
    /**
     * Ensures an env var is a url with a protocol and hostname
     */
    url(spec?: EnvSpec<string>): EnvValidatorSpec<string>;
    /**
     * Ensures an env var is an email address
     */
    email(spec?: EnvSpec<string>): EnvValidatorSpec<string>;
    /**
     * Ensures an env var is either a domain name or an ip address (v4 or v6)
     */
    host(spec?: EnvSpec<string>): EnvValidatorSpec<string>;
    /**
     * Ensures an env var is a TCP port (1-65535)
     */
    port(spec?: EnvSpec<number>): EnvValidatorSpec<number>;
}

export interface EnvSpec<T> extends EnvalidSpec<T> {
    shared?: boolean;
    /** If the value should be set and then validated. */
    value?: T;
}

export interface EnvValidatorSpec<T> extends EnvalidValidatorSpec<T> {
    /** Whether the variable should be shared between instances. */
    shared?: boolean;
    /** If the value should be set and then validated. */
    value?: T;
}

function parseEnvSpec<T>(type: keyof typeof envalid, spec: EnvSpec<T> = {}): EnvValidatorSpec<T> {
    const { shared, value, ...otherSpec } = spec;

    const vspec: EnvValidatorSpec<T> = (envalid as any)[type](otherSpec);

    if (shared) {
        vspec.shared = shared;
    }

    if (value != null) {
        vspec.value = value;
    }

    return vspec;
}
