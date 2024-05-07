import { Bot } from "https://deno.land/x/discordeno@18.0.1/bot.ts";
import { Message, deleteMessage, sendMessage, startThreadWithoutMessage } from "https://deno.land/x/discordeno@18.0.1/mod.ts";

export class MessageValidation {
    private bot: Bot;
    private message: Message;

    constructor(bot: Bot, message: Message) {
        this.bot = bot;
        this.message = message;
    }

    public validateBlackList(): boolean {
        let result = true;
        const blacklist = ["fuck", "shit", "damn", "whore", "bastard", "nigger", "ass", "cunt", "dick", "hell"];
        const escapedWords = blacklist.join('|');
        const reg = new RegExp('\\b(' + escapedWords + ')\\b', 'gi');
        if(reg.test(this.message.content.toLocaleLowerCase())) {
            result = false;
            deleteMessage(this.bot, this.message.channelId, this.message.id, "You used some profanity we do not allow in the channel");
            sendMessage(this.bot, this.message.channelId, {
                content: this.message.tag + " you have used some profanity we do not allow in the channel. As such we have deleted your message.",
              });
        }
        return result
    }
}