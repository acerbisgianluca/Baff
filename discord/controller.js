// Crypto package
const Cryptr = require('cryptr');
const cryptr = new Cryptr(process.env.CRYPTATION_KEY);

// Games db - for the future
//const igdb = require('igdb-api-node').default;
//const ig = igdb(process.env.IGDB_TOKEN);

// Local db
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const shortid = require('shortid');
const adapter = new FileSync('db.json', {
	serialize: (data) => cryptr.encrypt(JSON.stringify(data)),
	deserialize: (data) => JSON.parse(cryptr.decrypt(data))
});
const db = low(adapter);
db.defaults({ guilds: [], globalMatches: [], users: [] }).write();

let client;

// Supported games
const supportedGames = [
	{
		name: "Call of Duty: Black Ops 4",
		nicknames: ['bo4'],
		modes: [
			"1v1", "2v2", "5v5"
		]
	},
	{
		name: "Overwatch",
		nicknames: ['ow'],
		modes: [
			"1v1", "3v3", "6v6"
		]
	},
	{
		name: "Rocket League",
		nicknames: ['rl'],
		modes: [
			"1v1", "2v2", "3v3"
		]
	},
	{
		name: "Counter-Strike: Global Offensive",
		nicknames: ['csgo', 'cs-go'],
		modes: [
			"5v5"
		]
	}
];

// Supported commands
const supportedCommands = [
	{
		name: 'play',
		desc: `You'll be asked some information in order to find a match.`
	},
	{
		name: 'end',
		desc: `You'll be asked to tell if you've won, lost or drew.`
	},
	{
		name: 'cancel',
		desc: `I'll cancel the operation you were doing. If you're already matched your opponent must agree.`
	},
	{
		name: 'help',
		desc: `I'll display this message.`
	}
];

function matchFound(hostId, opponentId) {
	let host = client.users.get(hostId);
	let opponent = client.users.get(opponentId);

	host.send(`WOWOWO, I've found a match! **${opponent} (${opponent.tag}) is your opponent** ⚔️. Decide with him lobby details. At the end of the game type 'end'!`);
	opponent.send(`EHYYY, I've found a match! **${host} (${host.tag}) is your opponent** ⚔️. Decide with him lobby details. At the end of the game type 'end'!`);
}

function matchEnded(player1, player2) {
	let host = client.users.get(player1);
	let opponent = client.users.get(player2);

	host.send(`Perfect! ${opponent} ️️(${opponent.tag}) ️h️a️s️ ️correctly r️️e️p️o️r️t️e️d️. Now you can find another game!`);
	opponent.send(`Perfect! ${host} ️️(${host.tag}) ️h️a️s️ ️correctly r️️e️p️o️r️t️e️d️. Now you can find another game!`);
}

function matchReportWrong(player1, player2) {
	let host = client.users.get(player1);
	let opponent = client.users.get(player2);

	host.send(`There is a problem! **Your report doesn't match with ${opponent}'s (${opponent.tag}) ️️️report. You can't play again until the reports match.**`);
	opponent.send(`There is a problem! **Your report doesn't match with ${host}'s (${host.tag}) ️️️report. You can't play again until the reports match.**`);
}

function opponentReported(mustReport) {
	let playerMustReport = client.users.get(mustReport);

	playerMustReport.send(`**Your opponent has already reported!** Type 'end' to report.`);
}

function askForCancel(player1, player2) {
	let host = client.users.get(player1);
	let opponent = client.users.get(player2);

	opponent.send(`There is a problem! **${host} (${host.tag}) ️️️has asked to cancel the match.** Do you agree? Yes or no?`);
	db.get('users').find({ id: player2 }).assign({ lastCommand: { cmd: 'askForCancel', arg: '' } }).write();
}

function matchDeleted(player1, player2) {
	let host = client.users.get(player1);
	let opponent = client.users.get(player2);

	opponent.send(`Perfect! **${host} (${host.tag}) ️️️has agreed to cancel the match.** Now you can start a new one.`);
}

function opponentRefuseToCancel(player1, player2) {
	let host = client.users.get(player1);
	let opponent = client.users.get(player2);

	opponent.send(`Ops! **${host} (${host.tag}) ️️️has refused to cancel the match.** You need to give him a win typing 'end' or you must play the match.`);
}

function waitForReport(player, result){
	player = client.users.get(player);
	switch(result){
		case 'win':
			player.send(`Woo nice, just wait your opponent report!`);
			break;
		case 'lose':
			player.send(`Feelsbadman, just wait your opponent report!`);
			break;
		case 'draw':
			player.send(`Not bad at all, just wait your opponent report!`);
			break;
	}
}

module.exports = {
	setLastCommand: function (userId, obj) {
		if (obj.cmd === 'matchmakingStarted')
			db.get('users').find({ id: userId }).assign({ lastCommand: obj, isPlaying: true }).write();
		else if (obj.cmd === 'cancelled') {
			db.get('users').find({ id: userId }).assign({ lastCommand: obj, isPlaying: false }).write();
		}
		else if (obj.cmd === 'matchmakingCancelled') {
			let match = db.get('globalMatches').find({ host: userId, isEnded: false }).value();
			if (match) {
				if (match.opponent !== '') {
					askForCancel(match.host, match.opponent);
					return true;
				}
				db.get('globalMatches').remove({ host: userId, isEnded: false }).write();
				db.get('users').find({ id: match.host }).assign({ lastCommand: obj, isPlaying: false }).write();
				return false;
			}
			match = db.get('globalMatches').find({ opponent: userId, isPlaying: true, isEnded: false }).value();
			askForCancel(match.opponent, match.host);
			return true;
		}
		else if (obj.cmd === 'cancelMatch') {
			let match = db.get('globalMatches').find({ host: userId, isPlaying: true, isEnded: false }).value();
			if (match) {
				if (obj.arg === 'ok') {
					db.get('globalMatches').remove({ host: userId, isPlaying: true, isEnded: false }).write();
					db.get('users').find({ id: match.host }).assign({ lastCommand: obj, isPlaying: false }).write();
					db.get('users').find({ id: match.opponent }).assign({ lastCommand: obj, isPlaying: false }).write();
					matchDeleted(match.host, match.opponent);
				}
				else {
					opponentRefuseToCancel(match.host, match.opponent);
				}
				return;
			}
			match = db.get('globalMatches').find({ opponent: userId, isPlaying: true, isEnded: false }).value();
			if (obj.arg === 'ok') {
				db.get('globalMatches').remove({ opponent: userId, isPlaying: true, isEnded: false }).write();
				db.get('users').find({ id: match.host }).assign({ lastCommand: obj, isPlaying: false }).write();
				db.get('users').find({ id: match.opponent }).assign({ lastCommand: obj, isPlaying: false }).write();
				matchDeleted(match.opponent, match.host);
			}
			else {
				opponentRefuseToCancel(match.opponent, match.host);
			}
		}
		else if (obj.cmd === 'matchReported') {
			let match = db.get('globalMatches').find({ host: userId, isPlaying: true, isEnded: false }).value();
			if (match) {
				if (match.opponentReport !== '') {
					if (match.opponentReport === 'draw' && obj.arg === 'draw') {
						db.get('globalMatches').find({ id: match.id }).assign({ isPlaying: false, isEnded: true, hostReport: obj.arg }).write();
						matchEnded(match.host, match.opponent);
						db.get('users').find({ id: match.host }).assign({ lastCommand: obj, isPlaying: false }).write();
						db.get('users').find({ id: match.opponent }).assign({ lastCommand: obj, isPlaying: false }).write();
					}
					else if (match.opponentReport === 'win' && obj.arg === 'lose') {
						db.get('globalMatches').find({ id: match.id }).assign({ isPlaying: false, isEnded: true, hostReport: obj.arg }).write();
						matchEnded(match.host, match.opponent);
						db.get('users').find({ id: match.host }).assign({ lastCommand: obj, isPlaying: false }).write();
						db.get('users').find({ id: match.opponent }).assign({ lastCommand: obj, isPlaying: false }).write();
					}
					else if (match.opponentReport === 'lose' && obj.arg === 'win') {
						db.get('globalMatches').find({ id: match.id }).assign({ isPlaying: false, isEnded: true, hostReport: obj.arg }).write();
						matchEnded(match.host, match.opponent);
						db.get('users').find({ id: match.host }).assign({ lastCommand: obj, isPlaying: false }).write();
						db.get('users').find({ id: match.opponent }).assign({ lastCommand: obj, isPlaying: false }).write();
					}
					else {
						db.get('globalMatches').find({ id: match.id }).assign({ opponentReport: '' }).write();
						matchReportWrong(match.host, match.opponent);
					}
				}
				else {
					db.get('globalMatches').find({ id: match.id }).assign({ hostReport: obj.arg }).write();
					waitForReport(userId, obj.arg);
					opponentReported(match.opponent);
				}
				return;
			}
			match = db.get('globalMatches').find({ opponent: userId, isPlaying: true, isEnded: false }).value();
			if (match.hostReport !== '') {
				if (match.hostReport === 'draw' && obj.arg === 'draw') {
					db.get('globalMatches').find({ id: match.id }).assign({ isPlaying: false, isEnded: true, hostReport: obj.arg }).write();
					matchEnded(match.host, match.opponent);
					db.get('users').find({ id: match.host }).assign({ lastCommand: obj, isPlaying: false }).write();
					db.get('users').find({ id: match.opponent }).assign({ lastCommand: obj, isPlaying: false }).write();
				}
				else if (match.hostReport === 'win' && obj.arg === 'lose') {
					db.get('globalMatches').find({ id: match.id }).assign({ isPlaying: false, isEnded: true, hostReport: obj.arg }).write();
					matchEnded(match.host, match.opponent);
					db.get('users').find({ id: match.host }).assign({ lastCommand: obj, isPlaying: false }).write();
					db.get('users').find({ id: match.opponent }).assign({ lastCommand: obj, isPlaying: false }).write();
				}
				else if (match.hostReport === 'lose' && obj.arg === 'win') {
					db.get('globalMatches').find({ id: match.id }).assign({ isPlaying: false, isEnded: true, hostReport: obj.arg }).write();
					matchEnded(match.host, match.opponent);
					db.get('users').find({ id: match.host }).assign({ lastCommand: obj, isPlaying: false }).write();
					db.get('users').find({ id: match.opponent }).assign({ lastCommand: obj, isPlaying: false }).write();
				}
				else {
					db.get('globalMatches').find({ id: match.id }).assign({ hostReport: '' }).write();
					matchReportWrong(match.host, match.opponent);
				}
			}
			else {
				db.get('globalMatches').find({ id: match.id }).assign({ opponentReport: obj.arg }).write();
				waitForReport(userId, obj.arg);
				opponentReported(match.host);
			}
		}
		else
			db.get('users').find({ id: userId }).assign({ lastCommand: obj }).write();
	},
	findMatch: function (userId, settings, client) {
		let match = db.get('globalMatches').find({ game: settings.name, mode: settings.mode, isPlaying: false, isEnded: false }).value();
		if (match) {
			db.get('globalMatches').find({ id: match.id }).assign({ isPlaying: true, opponent: userId }).write();
			matchFound(match.host, userId);
			return;
		}

		let addedMatch = {
			id: shortid.generate(),
			host: userId,
			opponent: '',
			game: settings.name,
			mode: settings.mode,
			isPlaying: false,
			isEnded: false,
			hostReport: '',
			opponentReport: ''
		};

		db.get('globalMatches').push(addedMatch).write();
	},
	getUser: function (authorId, channelId) {
		let user = db.get('users').find({ id: authorId }).value();

		if (user)
			return user;

		let addedUser = {
			id: authorId,
			channel: channelId,
			isPlaying: false,
			lastCommand: {}
		};

		db.get('users').push(addedUser).write();

		return addedUser;
	},
	getGuild: function (guild, userId) {
		let { id } = guild;

		let guilds = db.get('guilds').value();
		guilds.forEach(el => {
			if (el.id === id)
				return el;
		});

		let addedGuild = {
			id: id,
			users: [],
			matches: []
		};

		db.get('guilds').push(addedGuild).write();

		return addedGuild;
	},
	getGame: function (gameName) {
		/*return ig.games({
			fields: ['name', 'popularity', 'game_modes'],
			limit: 1,
			order: 'popularity:desc',
			search: gameName
		}).then(response => {
			console.log(response.body[0]);
			supportedGames.forEach(el => {
				if (el.name === response.body[0].name)
					return el;
				return '';
			});
		});*/

		for (let i = 0; i < supportedGames.length; i++) {
			if (supportedGames[i].name.toLowerCase().includes(gameName) || supportedGames[i].nicknames.includes(gameName))
				return supportedGames[i];
		}
		return '';
	},
	getSupportedGames: function () {
		return supportedGames;
	},
	getSupportedCommands: function () {
		return supportedCommands;
	},
	setClient: function (discordClient) {
		client = discordClient;
	}
}
