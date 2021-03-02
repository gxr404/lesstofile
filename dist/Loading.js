"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var log_update_1 = __importDefault(require("log-update"));
var Loading = /** @class */ (function () {
    function Loading() {
        this.config = {
            interval: 80,
            // frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
            frames: ['-', '\\', '|', '/']
        };
        this.intervalId = null;
    }
    Loading.prototype.show = function (text) {
        var _this = this;
        if (text === void 0) { text = ''; }
        if (this.intervalId) {
            this.hide();
        }
        var i = 0;
        this.intervalId = setInterval(function () {
            log_update_1["default"](_this.config.frames[i = ++i % _this.config.frames.length] + " " + text);
        }, this.config.interval);
    };
    Loading.prototype.hide = function (text) {
        if (text === void 0) { text = ''; }
        clearInterval(this.intervalId);
        this.intervalId = null;
        log_update_1["default"](text);
    };
    return Loading;
}());
exports["default"] = Loading;
