module.exports = {
    hooks: {
        "pre-commit": "lint-staged -c ./.lintstagedrc.js && npm run build && rimraf dist && npm run test"
    },
};
