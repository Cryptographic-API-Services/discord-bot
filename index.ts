import {
  createBot,
  getMessage,
  handleMessageCreate,
  Intents,
  Message,
  startBot,
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { ChatOllama } from "npm:@langchain/community/chat_models/ollama";
import { ChatPromptTemplate } from "npm:@langchain/core/prompts";
import { StringOutputParser } from "npm:@langchain/core/output_parsers";
import { sendMessage } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { Bot } from "https://deno.land/x/discordeno@18.0.1/bot.ts";
import MessageCreateHandler from "./handlers/message-create.ts";

const bot = createBot({
  token: Deno.env.get("DISCORD_TOKEN"),
  intents: Intents.Guilds | Intents.GuildMessages,
  events: {
    ready() {
      console.log("Successfully connected to gateway");
    },
  },
});

bot.events.messageCreate = async function (b: Bot, message: Message) {
  new MessageCreateHandler(b, message).handleMessage();
};

await startBot(bot);
