"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var core_1 = require("@angular/core");
var http_1 = require("@angular/common/http");
var providers_1 = require("./providers");
var JsonApiModule = /** @class */ (function () {
    function JsonApiModule() {
    }
    JsonApiModule = tslib_1.__decorate([
        core_1.NgModule({
            providers: [providers_1.PROVIDERS],
            exports: [http_1.HttpClientModule]
        })
    ], JsonApiModule);
    return JsonApiModule;
}());
exports.JsonApiModule = JsonApiModule;
//# sourceMappingURL=module.js.map