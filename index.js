const keepAlive = require('./website/keepAlive.js');
const bot = require('./discord/bot.js');

// Local db and Crypto package
const Cryptr = require('cryptr');
const cryptr = new Cryptr(process.env.ENCRYPTION_KEY);
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json', {
	serialize: (data) => cryptr.encrypt(JSON.stringify(data)),
	deserialize: (data) => JSON.parse(cryptr.decrypt(data))
});
const db = low(adapter);
db.defaults({ guilds: [], globalMatches: [], users: [], websiteUsers: [] }).write();

bot.setDb(db);
keepAlive.setDb(db);

process.on('SIGTERM', () => {
	bot.bot.destroy()
		.then(() => {
			console.log('DISCORD > Client destroyed.');
			console.log('Shutting down the server.');
			process.exit(0);
		});
});
