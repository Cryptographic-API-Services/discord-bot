import { Bot } from "https://deno.land/x/discordeno@18.0.1/bot.ts";
import {
  getMessage,
  Message,
  sendMessage,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { ChatOllama } from "npm:@langchain/community/chat_models/ollama";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "npm:@langchain/core/prompts";
import { StringOutputParser } from "npm:@langchain/core/output_parsers";
import { OllamaEmbeddings } from "npm:@langchain/community/embeddings/ollama";
import { createStuffDocumentsChain } from "npm:langchain/chains/combine_documents";
import { AIMessage, HumanMessage } from "npm:@langchain/core/messages";
import { ChatMessageRepository } from "../repositories/chat-message-repository.ts";
import { ReloadDocumentationCommand } from "./reload-documentation.command.ts";
import { PGVectorStore } from "npm:@langchain/community/vectorstores/pgvector";
import { DocumentationVectorStoreRepository } from "../repositories/documentation-vector-store-repository.ts";
import { MessageRateLimiter } from "./message-rate-limiter.ts";

export default class MessageCreateHandler {
  bot: Bot;
  message: Message;
  rateLimiter: MessageRateLimiter;

  constructor(bot: Bot, message: Message, rateLimiter: MessageRateLimiter) {
    this.bot = bot;
    this.message = message;
    this.rateLimiter = rateLimiter;
  }

  public async handleMessage(): Promise<void> {
    try {
      const gotMessage: Message = await getMessage(
        this.bot,
        this.message.channelId,
        this.message.id,
      );
      if (!gotMessage.isFromBot && this.rateLimiter.checkRateLimitForUser(gotMessage.authorId)) {
        await sendMessage(this.bot, gotMessage.channelId, {content: `<@${gotMessage.authorId}> ` + `You have messaged the bot to many times in the last thirty seconds, please wait.`});
      } else {
        const sliceMessage = gotMessage.content.slice(0, 20).toLowerCase();
        if (sliceMessage.includes("hey bot:")) {
          await this.performHeyBotQuery(gotMessage);
        } else if (sliceMessage.includes("documentation:")) {
          await this.performDocumentationQuery(gotMessage);
        } else if (sliceMessage.includes("replace docs:")) {
          this.replaceDocumentation(gotMessage);
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
      model: Deno.env.get("LLM"),
    });
    const config = DocumentationVectorStoreRepository.getPgConnectionForVectorStore();
    const pgvectorStore = await PGVectorStore.initialize(
      embeddings,
      config
    );
    const documentSimilaritySearch = await pgvectorStore.similaritySearch(
      gotMessage.content,
    );
    const prompt = ChatPromptTemplate.fromTemplate(
      `You are my discord server bot. We offer a welcoming community for members to come and chat and talk all things tech and programming. You are to answer 
        questions to the best of your ability. You are provided with a list of documentation files for Cryptographic API Services in C# and TypeScript in the context.
        Answer the question to the best of your ability based on the code documentation in your context.
        If you are unsure of an answer, please let the user know. You are to use no profanity, racism etc.
      
      <context>
      {context}
      </context>
      
      Question: {input}`,
    );
    const documentChain = await createStuffDocumentsChain({
      llm: chatModel,
      prompt,
    });
    const llmResponse = await documentChain.invoke({
      input: gotMessage.content,
      context: documentSimilaritySearch,
    });
    await this.sendLLMResponse(gotMessage, llmResponse);
  }

  private async performHeyBotQuery(gotMessage: Message): Promise<void> {
    await ChatMessageRepository.insertChatMessage(
      gotMessage.content,
      gotMessage.authorId,
      gotMessage.channelId,
      false,
    );
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
    const chatMessagesQuery = await ChatMessageRepository
      .getChatMessagesByChannelIdAndUserId(
        gotMessage.channelId,
        gotMessage.authorId,
      );
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
    await ChatMessageRepository.insertChatMessage(
      llmResponse,
      gotMessage.authorId,
      gotMessage.channelId,
      true,
    );
    await this.sendLLMResponse(gotMessage, llmResponse);
  }

  private async sendLLMResponse(gotMessage: Message, llmResponse: string) {
    if (llmResponse.length > 1950) {
      let newMessage = `<@${gotMessage.authorId}> `;
      for (let i = 0; i < llmResponse.length; i += 1950) {
        newMessage += llmResponse.slice(i, i + 1950);
        await sendMessage(
          this.bot,
          gotMessage.channelId,
          {
            content: newMessage,
          },
        );
        newMessage = "";
      }
    } else {
      await sendMessage(
        this.bot,
        gotMessage.channelId,
        {
          content: `<@${gotMessage.authorId}> ` + llmResponse,
        },
      );
    }
  }

  private async replaceDocumentation(gotMessage: Message): Promise<void> {
    const reloadDocuments = new ReloadDocumentationCommand();
    await sendMessage(this.bot, gotMessage.channelId, {
      content: `<@${gotMessage.authorId}> ` + `The documentation is being replaced in the vector store. This may take a few minutes.`,
    });
    await reloadDocuments.initReloadingDocumentation();
    await sendMessage(this.bot, gotMessage.channelId, {
      content: `<@${gotMessage.authorId}> ` + `The Documentation has been repopulated in the vector store`,
    });
  }
}
