"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.main = void 0;
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var chokidar_1 = __importDefault(require("chokidar"));
var less_1 = __importDefault(require("less"));
var util_1 = require("./util");
var Loading_1 = __importDefault(require("./Loading"));
var LessToFile = /** @class */ (function () {
    function LessToFile(options) {
        this.importMap = {};
        /** 是否加载完毕 */
        this.isReady = false;
        /** 加载阶段中的error */
        this.readyErrList = [];
        this.options = options;
        if (this.checkArgs()) {
            this.run();
        }
    }
    /**
     * 检查参数是否合法
     */
    LessToFile.prototype.checkArgs = function () {
        if (this.options.help) {
            this.logHelp();
            return false;
        }
        var watchPath = this.options.dist;
        if (!watchPath || typeof watchPath !== 'string') {
            console.error('error: --dist 参数请输入合法的path');
            return false;
        }
        return true;
    };
    LessToFile.prototype.run = function () {
        var _this = this;
        var loading = new Loading_1["default"]();
        var isInitCompile = Boolean(this.options.init);
        if (!isInitCompile)
            loading.show('扫描中...');
        var watchPath = this.options.dist;
        var isWatch = this.options.watch !== 'false';
        // 默认输出wxss文件
        if (typeof this.options.ext !== 'string') {
            this.options.ext = 'wxss';
        }
        var watcher = chokidar_1["default"].watch(watchPath + '/**/*.less', {
            persistent: isWatch,
            ignoreInitial: false
        });
        watcher.on('ready', function () {
            if (!isInitCompile) {
                loading.hide('√ 扫描完毕 \(^o^)/~ \n');
            }
            else {
                console.log('√ 初始化编译完成');
            }
            _this.isReady = true;
            if (_this.readyErrList.length) {
                _this.readyErrList.forEach(function (err) { return _this.errorHandler(err); });
                _this.readyErrList = [];
            }
        });
        watcher.on('add', this.compileHandler.bind(this));
        watcher.on('change', this.compileHandler.bind(this));
    };
    /**
     * 打印help
     */
    LessToFile.prototype.logHelp = function () {
        var doc = {
            description: 'less to file',
            usage: 'lesstofile [options] [entry]',
            options: {
                '-d --dist': '目标目录',
                '-i --init': '是否初始编译 default=false',
                '-e --ext': '生成的后缀名 default=wxss',
                '-w --watch': '是否监听目录 default=true',
                '-h --help': '查看帮助'
            }
        };
        var logItem = function (key, data, indent) {
            if (key === void 0) { key = ''; }
            if (data === void 0) { data = {}; }
            if (indent === void 0) { indent = 0; }
            var indentText = Array(indent).fill(' ').join('');
            console.log("" + indentText + util_1.titleCase(key) + ": " + data[key]);
            console.log();
        };
        var log = function (data, indent) {
            if (indent === void 0) { indent = 0; }
            var docKey = Object.keys(data);
            docKey.forEach(function (key) {
                if (typeof data[key] === 'object' && data[key] !== null) {
                    log(data[key], 4);
                }
                else {
                    logItem(key, data, indent);
                }
            });
        };
        log(doc);
    };
    /**
     * 编译less
     */
    LessToFile.prototype.compileLess = function (filePath, cb) {
        var pathParse = path_1["default"].parse(filePath);
        var lessContext = fs_1["default"].readFileSync(filePath, 'utf8');
        var lessRenderOption = {
            filename: filePath,
            paths: [pathParse.dir],
            math: 'always',
            compress: false,
            ieCompat: true,
            strictUnits: true,
            javascriptEnabled: true
        };
        less_1["default"].render(lessContext, lessRenderOption)
            .then(function (output) {
            cb(null, { pathParse: pathParse, output: output });
        })["catch"](function (err) { return cb(err); });
    };
    LessToFile.prototype.getImportMapItem = function (filePath) {
        if (!this.importMap[filePath]) {
            this.importMap[filePath] = {
                beImport: [],
                "import": []
            };
        }
        return this.importMap[filePath];
    };
    /**
     * 编译处理
     */
    LessToFile.prototype.compileHandler = function (filePath) {
        var _this = this;
        var isInitCompile = Boolean(this.options.init);
        var isCompile = (isInitCompile && !this.isReady) || this.isReady;
        this.compileLess(filePath, function (err, compileRes) {
            if (err) {
                _this.errorHandler(err);
                return;
            }
            var pathParse = compileRes.pathParse, output = compileRes.output;
            var currentImportMapItem = _this.getImportMapItem(filePath);
            if (output.css && isCompile) {
                fs_1["default"].writeFile(pathParse.dir + "/" + pathParse.name + "." + _this.options.ext, output.css, function () {
                    console.log("\u221A compile success: " + filePath);
                });
            }
            var isValidImports = Array.isArray(output.imports) && output.imports.length > 0;
            if (!_this.isReady && isValidImports) {
                currentImportMapItem["import"] = currentImportMapItem["import"].concat(currentImportMapItem["import"], output.imports);
                output.imports.forEach(function (importPath) {
                    var importMapItem = _this.getImportMapItem(importPath);
                    importMapItem.beImport.push(filePath);
                });
            }
            // 有被引用的文件时需编译引用的文件
            if (_this.isReady && currentImportMapItem.beImport.length > 0) {
                _this.dependentHandler(currentImportMapItem.beImport);
            }
        });
    };
    /**
     * 依赖处理
     */
    LessToFile.prototype.dependentHandler = function (beImport) {
        var _this = this;
        if (beImport === void 0) { beImport = []; }
        beImport.forEach(function (beImportPath) {
            _this.compileLess(beImportPath, function (err, compileRes) {
                if (err) {
                    _this.errorHandler(err);
                    return;
                }
                var pathParse = compileRes.pathParse, output = compileRes.output;
                fs_1["default"].writeFile(pathParse.dir + "/" + pathParse.name + ".wxss", output.css, function () {
                    console.log("-- \u221A \u88AB\u5F15\u7528\u7F16\u8BD1: " + beImportPath + " compile success ");
                });
            });
        });
    };
    /**
     * 错误处理
     * @param err
     */
    LessToFile.prototype.errorHandler = function (err) {
        // 扫描阶段 的错误 push到readyErrList
        if (!this.isReady) {
            this.readyErrList.push(err);
            return;
        }
        console.error("\u00D7 Error: " + err.filename + ":" + err.line + ":" + err.column);
        console.error(" --" + err.message + "\n");
    };
    return LessToFile;
}());
var main = function (options) {
    var args = util_1.getArgs(options);
    new LessToFile(args);
};
exports.main = main;
