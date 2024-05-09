import {
  Bot,
  createBot,
  Intents,
  Message,
  startBot
} from "https://deno.land/x/discordeno@18.0.1/mod.ts";
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
  const handler = new MessageCreateHandler(b, message);
  await handler.handleMessage();
};

await startBot(bot);
