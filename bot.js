require("dotenv").config();

const { Telegraf, session } = require("telegraf");
const { Groq } = require("groq-sdk");
const express = require("express");
const job = require("./cron.js").job;

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

const getUserMessages = (ctx) => {
  if (!ctx.session.messages) {
    ctx.session.messages = [];
  }
  return ctx.session.messages.map((message) => ({
    role: "user",
    content: message,
  }));
};
const setUserMessages = (ctx, message) => {
  ctx.session.messages.push(message);

  if (ctx.session.messages.length > 10) {
    ctx.session.messages.shift();
  }
};

async function getGroqChatCompletion(ctx, userInput) {
  const mood = getUserMood(ctx);
  const cachedMessages = getUserMessages(ctx);
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: mood,
        },
        ...cachedMessages,
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

    setUserMessages(ctx, userInput);

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
const app = express();
const port = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

const sixteenMinutes = 1000 * 60 * 16;
setTimeout(() => {
  job.start();
}, sixteenMinutes);

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
