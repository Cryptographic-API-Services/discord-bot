import { Bot } from "https://deno.land/x/discordeno@18.0.1/bot.ts";
import { Message, deleteMessage, sendMessage } from "https://deno.land/x/discordeno@18.0.1/mod.ts";

export class MessageValidation {
    private bot: Bot;
    private message: Message;

    constructor(bot: Bot, message: Message) {
        this.bot = bot;
        this.message = message;
    }

    public async validateBlackList(): Promise<boolean> {
        let result = true;
        const blacklist = ["fuck", "shit", "damn", "whore", "bastard", "nigger", "ass", "cunt", "dick"];
        const message = this.message.content.toLowerCase();
        for (let i = 0; i < blacklist.length; i++) {
            if (message.includes(blacklist[i])) {
                result = false;
                await deleteMessage(this.bot, this.message.channelId, this.message.id, "You used some profanity we do not allow in the channel");
                await sendMessage(this.bot, this.message.channelId, {
                    content: `<@${this.message.authorId}>` + " you have used some profanity we do not allow in the channel. As such we have deleted your message.",
                  });
                  break;
            }
        }
        return result;
    }
}