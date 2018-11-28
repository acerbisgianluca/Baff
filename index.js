const keepAlive = require('./website/keepAlive.js');
const bot = require('./discord/bot.js');

process.on('SIGTERM', () => {
	bot.destroy()
		.then(() => {
			console.log('DISCORD > Client destroyed.');
			console.log('Shutting down the server.');
			process.exit(0);
		});
});