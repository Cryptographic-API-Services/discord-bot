import { Client } from "https://deno.land/x/postgres/mod.ts";

let config = Deno.env.get("POSTGRES_URL");
const db = new Client(config);
await db.connect();

export default db;