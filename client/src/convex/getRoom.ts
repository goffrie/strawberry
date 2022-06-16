import { query } from "convex-dev/server";

export default query(async ({ db }, name: string): Promise<{ name: string, value: string, version: number }> => {
    const { value, version } = await db.table("rooms").filter(q => q.eq(q.field("name"), name)).unique();
    return { name, value, version };
});