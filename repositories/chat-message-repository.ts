import { QueryArrayResult } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { pool } from "../database/database.ts";

export class ChatMessageRepository {

    public static async getChatMessagesByChannelIdAndUserId(channelId: bigint, userId: bigint): Promise<QueryArrayResult<unknown[]>> {
        const client = await pool.connect();
        const chatMesages = await client.queryArray(
            `SELECT "Content", "IsBot" FROM public."ChatMessages" WHERE "ChannelId" = ${channelId} AND "UserId" = ${userId} ORDER BY "CreatedAt" ASC;`,
          );
        client.release();
        return chatMesages;
    }

    public static async insertChatMessage(content: string, userId: bigint, channelId: bigint, isBot: boolean): Promise<void> {
        const client = await pool.connect();
        client.queryArray`INSERT INTO public."ChatMessages"(
            "Content", "UserId", "ChannelId", "IsBot", "CreatedAt")
            VALUES (${content}, ${userId}, ${channelId}, ${(isBot) ? 1 : 0}, ${new Date()});`;
        client.release();
    }
}