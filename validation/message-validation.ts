import { Bot } from "https://deno.land/x/discordeno@18.0.1/bot.ts";
import { Message, deleteMessage, sendMessage, startThreadWithoutMessage } from "https://deno.land/x/discordeno@18.0.1/mod.ts";

export class MessageValidation {
    public isValid: boolean = true;
    private bot: Bot;
    private message: Message;

    constructor(bot: Bot, message: Message) {
        this.bot = bot;
        this.message = message;
        this.validateBlackList();
    }

    private validateBlackList(): void {
        const blacklist = ["fuck", "shit", "damn", "whore", "bastard", "nigger", "ass", "cunt", "dick", "hell"];
        const reg = new RegExp(blacklist.join("|"));
        if(reg.test(this.message.content.toLocaleLowerCase())) {
            this.isValid = false;
            deleteMessage(this.bot, this.message.channelId, this.message.id, "You used some profanity we do not allow in the channel");
            sendMessage(this.bot, this.message.channelId, {
                content: "@" + this.message.tag + " you have used some profanity we do not allow in the channel. As such we have deleted your message.",
              });
        }
    }
}