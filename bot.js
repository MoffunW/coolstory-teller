require("dotenv").config();
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.on("sticker", (ctx) => ctx.reply("👍"));
bot.on("text", (ctx) => {
  (async function () {
    console.log(ctx.message.text);
    const userInput = ctx.message.text;

    const response = 1;

    ctx.reply(response + " " + userInput);
  })();
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
