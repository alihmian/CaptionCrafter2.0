"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blocked = void 0;
exports.add = add;
exports.remove = remove;
// blocked.ts
const promises_1 = __importDefault(require("fs/promises"));
const FILE = "./blocked.json";
/** in-memory cache (read once at boot) */
exports.blocked = new Set();
(async () => {
    try {
        const data = JSON.parse(await promises_1.default.readFile(FILE, "utf8"));
        for (const id of data)
            exports.blocked.add(id);
    }
    catch {
        /* first run: file absent → ignore */
    }
})();
/** keep helpers together */
async function add(id) {
    exports.blocked.add(id);
    await promises_1.default.writeFile(FILE, JSON.stringify([...exports.blocked]));
}
async function remove(id) {
    exports.blocked.delete(id);
    await promises_1.default.writeFile(FILE, JSON.stringify([...exports.blocked]));
}
