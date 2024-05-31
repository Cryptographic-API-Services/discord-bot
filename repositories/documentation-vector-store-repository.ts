import { pool } from "../database/database.ts";

export class DocumentationVectorStoreRepository {
    
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