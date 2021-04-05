"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callItAsync = void 0;
const mocha_1 = require("mocha");
function callItAsync(desc, data, callback) {
    data.forEach(function (val) {
        mocha_1.it(renderTemplate(desc, val), () => __awaiter(this, void 0, void 0, function* () {
            yield callback(val);
        }));
    });
}
exports.callItAsync = callItAsync;
/*
 * Add value to description
 */
function renderTemplate(template, valueRaw) {
    let value = valueRaw.toString();
    try {
        return eval("`" + template + "`;");
    }
    catch (err) {
        return template;
    }
}
//# sourceMappingURL=utils.js.map