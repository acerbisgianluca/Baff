const onMessage = require('./onMessage.js');
const db = require('./controller.js');

const Discord = require('discord.js');
const client = new Discord.Client();

//Client ID https://discordapp.com/oauth2/authorize?client_id=514097295420030977&scope=bot&permissions=268524625
client.login(process.env.DISCORD_TOKEN);

client.on('ready', () => {
	console.log('DISCORD > Logged in successful!');
	client.user.setPresence({ game: { name: `bb help me in ${client.guilds.size} servers!` }, status: 'online' });
});

client.on('guildCreate', () => {
	client.user.setPresence({ game: { name: `bb help me in ${client.guilds.size} servers!` }, status: 'online' });
});

client.on('guildDelete', () => {
	client.user.setPresence({ game: { name: `bb help me in ${client.guilds.size} servers!` }, status: 'online' });
});

client.on('message', msg => onMessage(msg));

db.setClient(client);

module.exports = client;
