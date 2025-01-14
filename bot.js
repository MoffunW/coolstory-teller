require("dotenv").config();
const { Telegraf } = require("telegraf");
const { Groq } = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});
const bot = new Telegraf(process.env.BOT_TOKEN);

async function getGroqChatCompletion(userInput) {
  console.log(userInput);
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Ты рассказчик бредовых историй, я отправляю тебе текст как начало истории, а ты её продолжаешь в манере нонсенс",
        },
        {
          role: "user",
          content: userInput,
        },
      ],
      model: "llama-3.3-70b-versatile",
    });

    return completion.choices[0]?.message?.content || "Got empty message";
  } catch (error) {
    console.error(error);
  }
}

bot.on("sticker", (ctx) => ctx.reply("👍"));
bot.on("text", (ctx) => {
  (async function () {
    const userInput = ctx.message.text;
    console.log(userInput, "input");

    const response = await getGroqChatCompletion(userInput);

    console.log(response, "response");
    if (!response) return console.log("No response");
    ctx.reply(response);
  })();
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
