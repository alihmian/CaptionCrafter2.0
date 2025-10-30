import * as fs from "fs";

const ACL_PATH = "./acl.json";

type ACL = {
    admins: string[];
    allowed: string[];
};

function load(): ACL {
    if (!fs.existsSync(ACL_PATH)) {
        const init: ACL = { admins: [], allowed: [] };
        fs.writeFileSync(ACL_PATH, JSON.stringify(init, null, 2));
        return init;
    }
    const raw = fs.readFileSync(ACL_PATH, "utf8");
    return JSON.parse(raw) as ACL;
}

function save(acl: ACL) {
    // atomic-ish write to reduce corruption risk
    const tmp = ACL_PATH + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(acl, null, 2));
    fs.renameSync(tmp, ACL_PATH);
}

export function isAdmin(userId: number | string): boolean {
    const id = String(userId);
    return load().admins.includes(id);
}

export function isAllowed(userId: number | string): boolean {
    const id = String(userId);
    const acl = load();
    return acl.admins.includes(id) || acl.allowed.includes(id);
}

export function addAllowed(userId: number | string): { added: boolean; reason?: string } {
    const id = String(userId);
    const acl = load();
    if (acl.admins.includes(id)) return { added: false, reason: "User is already an admin." };
    if (acl.allowed.includes(id)) return { added: false, reason: "User already allowed." };
    acl.allowed.push(id);
    save(acl);
    return { added: true };
}

export function removeAllowed(userId: number | string): { removed: boolean; reason?: string } {
    const id = String(userId);
    const acl = load();
    if (acl.admins.includes(id)) return { removed: false, reason: "Cannot remove an admin." };
    const before = acl.allowed.length;
    acl.allowed = acl.allowed.filter(x => x !== id);
    if (acl.allowed.length === before) return { removed: false, reason: "User was not allowed." };
    save(acl);
    return { removed: true };
}

export function listAllowed(): string[] {
    return load().allowed.slice();
}

export function listAdmins(): string[] {
    return load().admins.slice();
}