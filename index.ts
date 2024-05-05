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

const bot = createBot({
  token: Deno.env.get("DISCORD_TOKEN"),
  intents: Intents.Guilds | Intents.GuildMessages,
  events: {
    ready() {
      console.log("Successfully connected to gateway");
    },
  },
});

// Another way to do events
bot.events.messageCreate = async function (b, message) {
  const gotMessage: Message = await getMessage(
    b,
    message.channelId,
    message.id,
  );
  if (gotMessage.content.toLowerCase().includes("hey bot")) {
    const chatModel = new ChatOllama({
      baseUrl: Deno.env.get("OLLAMA_URL"),
      model: Deno.env.get("LLM"),
    });
    const response = await chatModel.invoke(gotMessage.content);
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
    const sendMessageResponse = await sendMessage(b, gotMessage.channelId, {content: llmResponse})
  }
  // Process the message here with your command handler.
};

await startBot(bot);
