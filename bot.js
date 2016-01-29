import Dice            from 'node-dice-js';
import Botkit          from 'botkit';
import redisStorage    from 'botkit-storage-redis';
import HerokuKeepalive from 'botkit-heroku-keepalive';

if (
  !process.env.BOTKIT_SLACK_CLIENT_ID ||
  !process.env.BOTKIT_SLACK_CLIENT_SECRET ||
  !process.env.PORT
) {
  console.error(
    'Error: Specify BOTKIT_SLACK_CLIENT_ID' +
    ' BOTKIT_SLACK_CLIENT_SECRET and port in environment'
  );

  process.exit(1);
}

const controller = Botkit.slackbot({
  debug: false,
  storage: redisStorage({
    url: process.env.REDISCLOUD_URL || 'redis://localhost:6379'
  })
}).configureSlackApp({
  clientId: process.env.BOTKIT_SLACK_CLIENT_ID,
  clientSecret: process.env.BOTKIT_SLACK_CLIENT_SECRET,
  scopes: ['commands']
});

let herokuKeepalive;

controller.setupWebserver(process.env.PORT, (_err, webserver) => {
  controller.createWebhookEndpoints(webserver);

  controller.createOauthEndpoints(webserver, (err, req, res) => {
    if (err) {
      res.status(500).send(`ERROR: ${err}`);
    } else {
      res.send('Success!');
    }
  });

  herokuKeepalive = new HerokuKeepalive(webserver);
  herokuKeepalive.start();
});

controller.on('slash_command', (bot, message) => {
  const dice = new Dice();
  const roll = dice.execute(message.text);

  bot.replyPublic(message, `<@${message.user}> ${roll.text.replace(/The result of /, '').replace(/ is /, ' = ')}`);
});
