// blocked.ts
import fs from "fs/promises";

const FILE = "./blocked.json";

/** in-memory cache (read once at boot) */
export const blocked = new Set<number>();

(async () => {
  try {
    const data = JSON.parse(await fs.readFile(FILE, "utf8"));
    for (const id of data) blocked.add(id);
  } catch {
    /* first run: file absent → ignore */
  }
})();

/** keep helpers together */
export async function add(id: number) {
  blocked.add(id);
  await fs.writeFile(FILE, JSON.stringify([...blocked]));
}
export async function remove(id: number) {
  blocked.delete(id);
  await fs.writeFile(FILE, JSON.stringify([...blocked]));
}
