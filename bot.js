require("dotenv").config();
const { Telegraf } = require("telegraf");
const deepai = require("deepai");
const cron = require("node-cron");

deepai.setApiKey(process.env.DEEPAI_TOKEN);

const translate = require("@vitalets/google-translate-api");

let inputText = "";

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.on("sticker", (ctx) => ctx.reply("👍"));
bot.on("text", (ctx) => {
    (async function () {
        console.log(ctx.message.text);
        cron.schedule("10 * 10 * * *", () => {
            console.log("running a task every minute");
            ctx.reply("hello");
        });

        // Translates input text
        await translate(ctx.message.text, {
            to: "en",
        }).then((res) => {
            inputText = res.text;
        });

        // Generate text
        let resp = await deepai.callStandardApi("text-generator", {
            text: inputText,
        });
        let output = await resp.output;
        console.log(output);

        // Generate picture
        let image = await deepai.callStandardApi("text2img", {
            text: inputText,
        });
        let imageSrc = image.output_url;

        // Translate and send text
        await translate(output, { from: "en", to: "ru" }).then((trasText) => {
            let res = trasText;
            ctx.reply(res.text);
            ctx.replyWithPhoto({
                url: imageSrc,
                filename: `${inputText}.jpg`,
            });
        });
    })();
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
