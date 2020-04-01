import { AcenoRC } from "./options.result";

export function assignOptions(props: { current: AcenoRC; assigned: Partial<AcenoRC> }) {
    if (props.assigned.cwd) {
        props.current.cwd = props.assigned.cwd;
    }

    if (props.assigned.extend) {
        if (props.current.extend) {
            for (const extendsPath of props.assigned.extend) {
                if (!props.current.extend.includes(extendsPath)) {
                    props.current.extend.push(extendsPath);
                }
            }
        } else {
            props.current.extend = props.assigned.extend;
        }
    }

    if (props.assigned.env) {
        if (props.current.env) {
            for (const env of props.assigned.env) {
                if (!props.current.env.includes(env)) {
                    props.current.env.push(env);
                }
            }
        } else {
            props.current.env = props.assigned.env;
        }
    }

    if (props.assigned.dev) {
        props.current.dev = true;

        process.env.NODE_ENV = "development";
    }

    if (props.assigned.id) {
        props.current.id = props.assigned.id;
    }

    if (props.assigned.tsconfig) {
        props.current.tsconfig = props.assigned.tsconfig;
    }
}
