require("dotenv").config();
const { Telegraf, session } = require("telegraf");
const { Groq } = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session());

bot.use((ctx, next) => {
  if (!ctx.session) {
    ctx.session = {}; // Инициализация пустой сессии
  }
  return next();
});

const initialMood =
  "Ты рассказчик бредовых историй, я отправляю тебе текст как начало истории, а ты её продолжаешь в манере нонсенс";
const getUserMood = (ctx) => ctx.session.mood || initialMood;
const setUserMood = (ctx, mood) => (ctx.session.mood = mood);
let moodChangeInProcess = false;

async function getGroqChatCompletion(ctx, userInput) {
  const mood = getUserMood(ctx);
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
bot.command("current", (ctx) => {
  ctx.reply(`Текущие настройки:\n ${getUserMood(ctx)}`);
});
bot.command("cancel", (ctx) => {
  moodChangeInProcess = true;
  setUserMood(ctx, initialMood);
  ctx.reply(`Настроение сброшено до базовых.\nТекущие настройки:\n ${mood}`);
  moodChangeInProcess = false;
});
bot.command("mood", (ctx) => {
  ctx.reply("Введите новое настроение для бота:");
  moodChangeInProcess = true;
});

bot.on("text", (ctx) => {
  const userInput = ctx.message.text;

  if (userInput.startsWith("/")) return;

  if (moodChangeInProcess) {
    setUserMood(ctx, userInput);
    moodChangeInProcess = false;

    ctx.reply(`Новое настроение установлено:\n "${userInput}"`);
    return;
  }

  (async function () {
    console.log(userInput, "input");

    const response = await getGroqChatCompletion(ctx, userInput);

    console.log(response, "response");
    if (!response) {
      console.error("No response");
      return;
    }
    ctx.reply(response);
  })();
});

bot.on("sticker", (ctx) => ctx.reply("👍"));

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
