import { pool } from "../database/database.ts";
import { PoolConfig } from "npm:pg";
import { DistanceStrategy, PGVectorStoreArgs } from "npm:@langchain/community/vectorstores/pgvector";

export class DocumentationVectorStoreRepository {
    
    public static getPgConnectionForVectorStore(): PGVectorStoreArgs {
        return {
            postgresConnectionOptions: {
              type: "postgres",
              host: Deno.env.get("POSTGRES_HOST"),
              port: 5432,
              user: Deno.env.get("POSTGRES_USER"),
              password: Deno.env.get("POSTGRES_PASSWORD"),
              database: Deno.env.get("POSTGRES_DATABASE"),
            } as PoolConfig,
            tableName: "testlangchain",
            columns: {
              idColumnName: "id",
              vectorColumnName: "vector",
              contentColumnName: "content",
              metadataColumnName: "metadata",
            },
            // supported distance strategies: cosine (default), innerProduct, or euclidean
            distanceStrategy: "cosine" as DistanceStrategy,
          };
    }

    public static async clearDocumentationVectorStore(): Promise<void> {
        const client = await pool.connect();
        client.queryArray`DO $$
        BEGIN
           IF EXISTS (
               SELECT FROM pg_tables
               WHERE  schemaname = 'public'
               AND    tablename  = 'testlangchain'
           ) THEN
               DELETE FROM public."testlangchain";
           END IF;
        END $$`
        client.release();
    }
}