"use strict";
exports.__esModule = true;
exports.titleCase = exports.getArgs = void 0;
var getArgs = function (argv) {
    if (argv === void 0) { argv = []; }
    var rawList = argv.slice(2);
    var optionsKeyReg = /^(--|-)(.*)/;
    var isOptionsKey = function (val) { return optionsKeyReg.test(val); };
    var args = {};
    var index = 0;
    var aliasMap = {
        d: 'dist',
        h: 'help',
        e: 'ext',
        w: 'watch',
        i: 'init'
    };
    while (index < rawList.length) {
        if (isOptionsKey(rawList[index])) {
            var key = rawList[index].replace(optionsKeyReg, function (match, p1, p2, offset, string) {
                if (p1 === '-') {
                    return aliasMap[p2] || p2;
                }
                return p2 || '';
            });
            index += 1;
            var value = true;
            if (rawList[index] && !isOptionsKey(rawList[index])) {
                value = rawList[index];
                index += 1;
            }
            args[key] = value;
        }
        else {
            index += 1;
        }
    }
    return args;
};
exports.getArgs = getArgs;
var titleCase = function (str) { return str.replace(/^([a-z])(.*)/g, function (match, p1, p2, offset, string) {
    if (match)
        return "" + p1.toLocaleUpperCase() + p2;
    return string;
}); };
exports.titleCase = titleCase;
