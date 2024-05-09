import { pool } from "../database/database.ts";

export class DocumentationVectorStoreRepository {
    
    public static async clearDocumentationVectorStore(): Promise<void> {
        const client = await pool.connect();
        client.queryArray`DELETE FROM public."vectorstore_documents"`
        client.release();
    }
}