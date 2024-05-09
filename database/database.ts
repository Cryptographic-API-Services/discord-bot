import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const pool = new Pool({
  database: Deno.env.get("POSTGRES_DATABASE"),
  hostname: Deno.env.get("POSTGRES_HOST"),
  port: 5432,
  user: Deno.env.get("POSTGRES_USER"),
  password: Deno.env.get("POSTGRES_PASSWORD"),
  connection: {
    attempts: 10,
  },
}, 10);

export { pool };
