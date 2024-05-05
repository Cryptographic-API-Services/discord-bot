import { Bot } from "https://deno.land/x/discordeno@18.0.1/bot.ts";
import {
  getMessage,
  Message,
  sendMessage,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { ChatOllama } from "npm:@langchain/community/chat_models/ollama";
import { ChatPromptTemplate } from "npm:@langchain/core/prompts";
import { StringOutputParser } from "npm:@langchain/core/output_parsers";

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
        if (gotMessage.content.toLowerCase().includes("hey bot")) {
          await this.performHeyBotQuery(gotMessage);
        }
    } catch (error) {
        console.error(error);
    }
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
                    questions to the best of your ability. If you are unsure of an answer, please let the user know.`,
        ],
        ["user", "{input}"],
      ]);
      const outputParser = new StringOutputParser();
      const llmChain = prompt.pipe(chatModel).pipe(outputParser);
      const llmResponse = await llmChain.invoke({
        input: gotMessage.content,
      });
      const sendMessageResponse = await sendMessage(this.bot, gotMessage.channelId, {
        content: llmResponse,
      });
  }
}
