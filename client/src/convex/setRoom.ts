import { mutation } from "convex-dev/server";

export default mutation(async ({ db }, name: string, version: number, newState: string) => {
    const existing = await db.table("rooms").filter(q => q.eq(q.field("name"), name)).unique();
    if (existing.version !== version) return false;
    db.replace(existing._id, { name, value: newState, version: existing.version + 1 });
});