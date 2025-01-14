require("dotenv").config();

const { Telegraf, session } = require("telegraf");
const { Groq } = require("groq-sdk");
const express = require("express");
const { interleaveArrays } = require("./utils.js");
const job = require("./cron.js").job;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session());

bot.use((ctx, next) => {
  if (!ctx.session) {
    ctx.session = {
      messages: {
        user: [],
        system: [],
      },
    }; // Инициализация пустой сессии
  }
  return next();
});

const initialMood =
  "Ты рассказчик бредовых историй, я отправляю тебе текст как начало истории, а ты её продолжаешь в манере нонсенс";
const getUserMood = (ctx) => ctx.session.mood || initialMood;
const setUserMood = (ctx, mood) => (ctx.session.mood = mood);
let moodChangeInProcess = false;

const roles = {
  system: "system",
  user: "user",
};

const setMessages = (ctx, role, message) => {
  if (!ctx || !role || !message) {
    console.error("Required 3 params");
    return;
  }
  const cached = ctx.session.messages[role];

  cached.push(message);

  if (cached.length > 10) cached.shift();
};

const getMessages = (ctx, role) => {
  if (!ctx || role) {
    console.error("Required 3 params");
    return;
  }
  const cached = ctx.session.messages[role];

  if (!cached) cached = [];

  return cached.map((message) => ({
    role: role,
    content: message,
  }));
};

async function getGroqChatCompletion(ctx, userInput) {
  const mood = getUserMood(ctx);
  const cachedUserMessages = getMessages(ctx, roles.user);
  const cachedSystemMessages = getMessages(ctx, roles.system);
  const dialogInOrder = interleaveArrays(
    cachedUserMessages,
    cachedSystemMessages,
  );

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: mood,
        },
        ...dialogInOrder,
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

    setMessages(ctx, roles.user, userInput);

    console.log(response, "response");
    if (!response) {
      console.error("No response");
      return;
    }
    ctx.reply(response);
    setMessages(ctx, roles.system, response);
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
