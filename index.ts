import {
  Bot,
  createBot,
  Intents,
  Message,
  startBot
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import MessageCreateHandler from "./handlers/message-create.ts";
import { MessageRateLimiter } from "./handlers/message-rate-limiter.ts";

const bot = createBot({
  token: Deno.env.get("DISCORD_TOKEN"),
  intents: Intents.Guilds | Intents.GuildMessages,
  events: {
    ready() {
      console.log("Successfully connected to gateway");
    },
  },
});

const rateLimiter = new MessageRateLimiter();

bot.events.messageCreate = async function (b: Bot, message: Message) {
  try {
    const handler = new MessageCreateHandler(b, message, rateLimiter);
    await handler.handleMessage();
  } catch(error) {
    console.error(error);
  }
};

await startBot(bot);
