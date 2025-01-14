require("dotenv").config();
const { Telegraf } = require("telegraf");
const { Groq } = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});
const bot = new Telegraf(process.env.BOT_TOKEN);

let mood =
  "Ты рассказчик бредовых историй, я отправляю тебе текст как начало истории, а ты её продолжаешь в манере нонсенс";

async function getGroqChatCompletion(userInput) {
  console.log(userInput);
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: mood,
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

bot.command("mood", (ctx) => {
  ctx.reply("Введите новое настроение для бота:");

  // Переход в режим ожидания сообщения пользователя
  bot.on("text", async (ctxReply) => {
    const newMood = ctxReply.message.text;
    mood = newMood; // Обновляем переменную mood
    ctxReply.reply(`Новое настроение установлено: "${mood}"`);
    bot.removeTextListener(); // Удаляем обработчик, чтобы не перезаписывать настроение случайно
  });
});
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
