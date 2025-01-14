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
const initialMood = mood;
let moodChangeInProcess = false;

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

const commands = {
  cancel: "cancel",
  mood: "mood",
  current: "current",
};

bot.command(commands.current, (ctx) => {
  ctx.reply(`Текущие настройки:\n ${mood}`);
});
bot.command(commands.cancel, (ctx) => {
  moodChangeInProcess = true;
  mood = initialMood;
  ctx.reply(`Настроение сброшено до базовых.\nТекущие настройки:\n ${mood}`);
  moodChangeInProcess = false;
});
bot.command(commands.mood, (ctx) => {
  ctx.reply("Введите новое настроение для бота:");
  moodChangeInProcess = true;
});

bot.on("text", (ctx) => {
  const userInput = ctx.message.text;
  const isCommand = Object.values(commands).some(
    (command) => `/${command}` === userInput,
  );

  if (isCommand) return;

  if (moodChangeInProcess) {
    mood = userInput;
    moodChangeInProcess = false;
    ctx.reply(`Новое настроение установлено:\n "${mood}"`);
    return;
  }

  (async function () {
    console.log(userInput, "input");

    const response = await getGroqChatCompletion(userInput);

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
