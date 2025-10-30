"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = isAdmin;
exports.isAllowed = isAllowed;
exports.addAllowed = addAllowed;
exports.removeAllowed = removeAllowed;
exports.listAllowed = listAllowed;
exports.listAdmins = listAdmins;
const fs = __importStar(require("fs"));
const ACL_PATH = "./acl.json";
function load() {
    if (!fs.existsSync(ACL_PATH)) {
        const init = { admins: [], allowed: [] };
        fs.writeFileSync(ACL_PATH, JSON.stringify(init, null, 2));
        return init;
    }
    const raw = fs.readFileSync(ACL_PATH, "utf8");
    return JSON.parse(raw);
}
function save(acl) {
    // atomic-ish write to reduce corruption risk
    const tmp = ACL_PATH + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(acl, null, 2));
    fs.renameSync(tmp, ACL_PATH);
}
function isAdmin(userId) {
    const id = String(userId);
    return load().admins.includes(id);
}
function isAllowed(userId) {
    const id = String(userId);
    const acl = load();
    return acl.admins.includes(id) || acl.allowed.includes(id);
}
function addAllowed(userId) {
    const id = String(userId);
    const acl = load();
    if (acl.admins.includes(id))
        return { added: false, reason: "User is already an admin." };
    if (acl.allowed.includes(id))
        return { added: false, reason: "User already allowed." };
    acl.allowed.push(id);
    save(acl);
    return { added: true };
}
function removeAllowed(userId) {
    const id = String(userId);
    const acl = load();
    if (acl.admins.includes(id))
        return { removed: false, reason: "Cannot remove an admin." };
    const before = acl.allowed.length;
    acl.allowed = acl.allowed.filter(x => x !== id);
    if (acl.allowed.length === before)
        return { removed: false, reason: "User was not allowed." };
    save(acl);
    return { removed: true };
}
function listAllowed() {
    return load().allowed.slice();
}
function listAdmins() {
    return load().admins.slice();
}
