const cron = require("cron");
const https = require("https");

const backendUrl = "https://coolstory-teller.onrender.com/healthz";

const job = new cron.CronJob("*/16 * * * *", function () {
  console.log("CRON: restaring server");
  https
    .get(backendUrl, (res) => {
      if (res.statusCode === 200) console.log("CRON: server started");
      else
        console.error(
          "CRON: failed to restart server with status code: ",
          res.statusCode,
        );
    })
    .on("error", (error) =>
      console.error("CRON: error during restart: ", error.message),
    );
});

module.exports = {
  job: job,
};
