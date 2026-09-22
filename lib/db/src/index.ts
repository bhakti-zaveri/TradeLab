import path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL || "file:./local.db";
export const client = createClient({ url: dbUrl });
export const db = drizzle(client, { schema });

export * from "./schema";
