require("dotenv").config();

const { Telegraf, session } = require("telegraf");
const { Groq } = require("groq-sdk");
const { interleaveArrays } = require("./utils.js");

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
    };
  }
  return next();
});

const initialMood =
  "Ты рассказчик смешных историй, я отправляю тебе текст как начало истории, а ты её продолжаешь развивать тему как бы это делал хороший друг";
const getMood = (ctx) => ctx.session.mood || initialMood;
const setMood = (ctx, mood) => (ctx.session.mood = mood);
let moodChangeInProcess = false;

const roles = {
  system: "system",
  user: "user",
};

const setMessages = (ctx, role, message) => {
  if (!role || !message) {
    console.error("no required params");
    return;
  }
  const cached = ctx.session.messages[role];

  cached.push(message);

  if (cached.length > 10) cached.shift();
};

const clearMessages = (ctx) => {
  ctx.session.messages[roles.user] = [];
  ctx.session.messages[roles.system] = [];
};

const getMessages = (ctx, role) => {
  if (!role) {
    console.error("Required role");
    return [];
  }
  const cached = ctx.session.messages[role];

  if (!cached) cached = [];

  return cached.map((message) => ({
    role: role,
    content: message,
  }));
};

async function getGroqChatCompletion(ctx, userInput) {
  const mood = getMood(ctx);
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
    ctx.reply("Произошла ошибка в генерации: ", error);
    console.error(error);
  }
}
bot.command("current", (ctx) => {
  ctx.reply(`Текущие настройки:\n ${getMood(ctx)}`);
});
bot.command("cancel", (ctx) => {
  setMood(ctx, initialMood);
  clearMessages(ctx);
  ctx.reply(`Настроение сброшено до базовых.\nТекущие настройки:\n ${mood}`);
});
bot.command("mood", (ctx) => {
  ctx.reply("Введите новое настроение для бота:");
  moodChangeInProcess = true;
});

bot.on("text", (ctx) => {
  const userInput = ctx.message.text;

  if (userInput.startsWith("/")) return;

  if (moodChangeInProcess) {
    setMood(ctx, userInput);
    clearMessages(ctx);
    moodChangeInProcess = false;

    ctx.reply(`Новое настроение установлено:\n "${userInput}"`);
    return;
  }

  (async function () {
    console.log("USER INPUT: ", userInput);

    const response = await getGroqChatCompletion(ctx, userInput);

    console.log("AI RESPONSE: ", response);
    if (!response) {
      console.error("No response");
      return;
    }
    ctx.reply(response);

    setMessages(ctx, roles.user, userInput);
    setMessages(ctx, roles.system, response);
  })();
});

bot.on("sticker", (ctx) => ctx.reply("👍"));

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
