export function printAndExit(message: string, code = 1) {
    if (code === 0) {
        console.info(message);
    } else {
        console.error(message);
    }

    process.exit(code);
}
