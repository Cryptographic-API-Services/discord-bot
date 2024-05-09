import { Bot } from "https://deno.land/x/discordeno@18.0.1/bot.ts";
import {
  getMessage,
  Message,
  sendMessage,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { ChatOllama } from "npm:@langchain/community/chat_models/ollama";
import { ChatPromptTemplate, MessagesPlaceholder } from "npm:@langchain/core/prompts";
import { StringOutputParser } from "npm:@langchain/core/output_parsers";
import { OllamaEmbeddings } from "npm:@langchain/community/embeddings/ollama";
import { NeonPostgres } from "npm:@langchain/community/vectorstores/neon";
import { createStuffDocumentsChain } from "npm:langchain/chains/combine_documents";
import { MessageValidation } from "../validation/message-validation.ts";
import db from "../database/database.ts";
import { AIMessage, HumanMessage } from "npm:@langchain/core/messages";

export default class MessageCreateHandler {
  bot: Bot;
  message: Message;

  constructor(bot: Bot, message: Message) {
    this.bot = bot;
    this.message = message;
  }

  public async handleMessage(): Promise<void> {
    try {
        const gotMessage: Message = await getMessage(
          this.bot,
          this.message.channelId,
          this.message.id,
        );
        const validation = new MessageValidation(this.bot, gotMessage);
        if (await validation.validateBlackList()) {
          const sliceMessage = gotMessage.content.slice(0, 20).toLowerCase();
          if (sliceMessage.toLowerCase().includes("hey bot:")) {
            await this.performHeyBotQuery(gotMessage);
          } else if (sliceMessage.toLowerCase().includes("documentation:")) {
            await this.performDocumentationQuery(gotMessage);
          }
        }
    } catch (error) {
        console.error(error);
    }
  }

  private async performDocumentationQuery(gotMessage: Message): Promise<void> {
    const chatModel = new ChatOllama({
        baseUrl: Deno.env.get("OLLAMA_URL"),
        model: Deno.env.get("LLM"),
      });
      const embeddings = new OllamaEmbeddings({
        baseUrl: Deno.env.get("OLLAMA_URL"),
        model: Deno.env.get("LLM")
      });
      const vectorStore = await NeonPostgres.initialize(embeddings, {
        connectionString: Deno.env.get("POSTGRES_URL") as string,
      });
      const documentSimilaritySearch = await vectorStore.similaritySearch(gotMessage.content);
      const prompt = ChatPromptTemplate.fromTemplate(
        `You are my discord server bot. We offer a welcoming community for members to come and chat and talk all things tech and programming. You are to answer 
        questions to the best of your ability. You are provided with a list of documentation files for Cryptographic API Services in C# and TypeScript in the context.
        Answer the question to the best of your ability based on the code documentation in your context. Your response must be 2000 characters or less.
        If you are unsure of an answer, please let the user know. Your answers should be 2000 characters or less. You are to use no profanity, racism etc.
      
      <context>
      {context}
      </context>
      
      Question: {input}`,
      );
      const documentChain = await createStuffDocumentsChain({
        llm: chatModel,
        prompt,
      });
      const invokeResponse = await documentChain.invoke({
        input: gotMessage.content,
        context: documentSimilaritySearch
      });
      console.log(invokeResponse);
      await sendMessage(this.bot, gotMessage.channelId, {
        content: `<@${gotMessage.authorId}> ` + invokeResponse,
      });
  }

  private async performHeyBotQuery(gotMessage: Message): Promise<void> {
    const chatModel = new ChatOllama({
        baseUrl: Deno.env.get("OLLAMA_URL"),
        model: Deno.env.get("LLM"),
      });
      const prompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          `You are my discord server bot. We offer a welcoming community for members to come and chat and talk all things tech and programming. You are to answer 
          questions to the best of your ability. If you are unsure of an answer, please let the user know. Your answers should be 2000 characters or less. 
          You are to use no profanity, racism etc`,
        ],
        new MessagesPlaceholder("chatHistory"),
        ["user", "{input}"],
      ]);
      const contextualizeQChain = prompt.pipe(chatModel).pipe(
        new StringOutputParser(),
      );
      const chatMessagesQuery = await db.queryArray(`SELECT "Content", "IsBot" FROM public."ChatMessages" WHERE "ChannelId" = ${gotMessage.channelId} AND "UserId" = ${gotMessage.authorId} ORDER BY "CreatedAt" DESC;`);
      let chatHistory = [];
      for (let i = 0; i < chatMessagesQuery.rows.length; i++) {
        let currentRow = chatMessagesQuery.rows[i];
        if (!currentRow[1]) {
          chatHistory.push(new HumanMessage(currentRow[0]));
        } else {
          chatHistory.push(new AIMessage(currentRow[0]));
        }
      }
      const llmResponse = await contextualizeQChain.invoke({
        chatHistory: chatHistory,
        input: gotMessage.content,
      });
      await db.queryArray`INSERT INTO public."ChatMessages"(
        "Content", "UserId", "ChannelId", "IsBot", "CreatedAt")
        VALUES (${llmResponse}, ${gotMessage.authorId}, ${gotMessage.channelId}, ${1}, ${new Date()});`;
        await db.queryArray`INSERT INTO public."ChatMessages"(
          "Content", "UserId", "ChannelId", "IsBot", "CreatedAt")
          VALUES (${gotMessage.content}, ${gotMessage.authorId}, ${gotMessage.channelId}, ${0}, ${new Date()});`;
      const sendMessageResponse = await sendMessage(this.bot, gotMessage.channelId, {
        content: `<@${gotMessage.authorId}> ` + llmResponse,
      });
  }
}
