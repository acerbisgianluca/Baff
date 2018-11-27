//DB Manager
const db = require('./controller.js');

const supportedGames = db.getSupportedGames();

const supportedCommands = db.getSupportedCommands();

// Main function
module.exports = msg => {
	if (msg.author.bot)
		return;

	let txt = msg.content.toLowerCase().trim();
	let user = db.getUser(msg.author.id, msg.channel.id);
	let chat = msg.channel;

	if (msg.guild) {
		if(txt === 'bb text me'){
			msg.author.send(`Hey ${msg.author.username}, welcome to Baff Bot! I'll help you to play matches against other Discord users.\nTell me 'play' and you'll be asked some information to start looking for worthy players! Don't forget that if you have any problems, just type 'help'.\nMake sure to **allow friend request from ALL! It may happen that you see random numbers instead of user tag because of his privacy settings, so just copy his tag (as plain text) and manually search him.**`);
			msg.reply(`I've contacted you in DM!`);
			db.setLastCommand(user.id, { cmd: 'started', arg: '' });
		}
	}
	else {
		if (user.lastCommand.cmd) {
			//Super commands (cancel, play, end and help)
			if (txt === 'cancel') {
				if (user.lastCommand.cmd === 'matchmakingStarted') {
					let wasMatched = db.setLastCommand(user.id, { cmd: 'matchmakingCancelled', arg: '' });
					if (wasMatched)
						chat.send(`I'll ask your opponent if he wants to cancel too!`);
					else
						chat.send(`Ohh ok, let me know when you want to play!`);
					return;
				}
				chat.send(`Ohh ok, let me know when you want to play!`);
				db.setLastCommand(user.id, { cmd: 'cancelled', arg: '' });

				return;
			}
			if (txt === 'play') {
				if (!user.isPlaying) {
					chat.send(`What game do you want to play?\nThese are the supported games: ${supportedGamesToString()}`);
					db.setLastCommand(user.id, { cmd: 'askForGame', arg: '' });
				}
				else {
					chat.send(`**You are already in a match!** To quit type 'cancel'.`);
				}
				return;
			}
			if (txt === 'end') {
				if (user.isPlaying) {
					chat.send(`Okk, **who has won?** Type 'I'/'we' if you've won, 'he'/'they' if you've lost or 'draw' if you've drew.`);
					db.setLastCommand(user.id, { cmd: 'askForReport', arg: '' });
				}
				else {
					chat.send(`**You are NOT in a match!** To find one type 'play'.`);
				}
				return;
			}
			if (txt === 'help') {
				chat.send(`These are the supported commands:\n${supportedCommandsToString()}`)
				return;
			}
			switch (user.lastCommand.cmd) {
				case 'askForGame':
					let game1 = db.getGame(txt);
					if (game1 != '') {
						chat.send(`Ohh nice! For ${game1.name} there are ${game1.modes.length} modes: ${modesToString(game1.modes)}. Choose one.\n**Remember that you need a team as big as the players needed by the chosen mode!**`);
						db.setLastCommand(user.id, { cmd: 'askForMode', arg: game1 });
					}
					else {
						chat.send(`Ups, ${txt} it's not supported!\nThese are the supported games: ${supportedGamesToString()}`);
					}
					break;
				case 'askForMode':
					let game2 = user.lastCommand.arg;
					if (game2.modes.includes(txt)) {
						chat.send(`Perfect! Do you want me to start looking for a match on ${game2.name} - ${txt}? Yes or no?`);
						db.setLastCommand(user.id, { cmd: 'askForMatchmaking', arg: { name: game2.name, mode: txt } });
					}
					else {
						chat.send(`Wait, ${txt} it's not a valid mode for ${game2.name}!\nThese are the supported modes: ${modesToString(game2.modes)}`);
					}
					break;
				case 'askForMatchmaking':
					let game3 = user.lastCommand.arg;
					if (txt === 'y' || txt === 'yes' || txt === 'yep') {
						chat.send(`Nice, I'm looking for a match! I'll let you know when I'll find a game 🔍`);
						db.setLastCommand(user.id, { cmd: 'matchmakingStarted', arg: '' });
						db.findMatch(user.id, { name: game3.name, mode: game3.mode });
					}
					else if (txt === 'n' || txt === 'no' || txt === 'nope') {
						chat.send(`Okk, I've just cancelled the operation! Do you want to edit game/mode? Yes or no?`);
						db.setLastCommand(user.id, { cmd: 'cancelMatchmaking', arg: game3 });
					}
					else
						chat.send(`You can just say 'yes' or 'no'.`);
					break;
				case 'cancelMatchmaking':
					let game4 = user.lastCommand.arg;
					if (txt === 'y' || txt === 'yes' || txt === 'yep') {
						chat.send(`No problem, what game do you want to play?\nThese are the supported games: ${supportedGamesToString()}`);
						db.setLastCommand(user.id, { cmd: 'askForGame', arg: '' });
					}
					else if (txt === 'n' || txt === 'no' || txt === 'nope') {
						chat.send(`Ohh ok, let me know when you want to play!`);
						db.setLastCommand(user.id, { cmd: 'cancelled', arg: '' });
					}
					else
						chat.send(`You can just say 'yes' or 'no'.`);
					break;
				case 'askForReport':
					if (txt === 'i' || txt === 'we') {
						db.setLastCommand(user.id, { cmd: 'matchReported', arg: 'win' });
					}
					else if (txt === 'he' || txt === 'they' || txt === 'her') {
						db.setLastCommand(user.id, { cmd: 'matchReported', arg: 'lose' });
					}
					else if (txt === 'draw') {
						db.setLastCommand(user.id, { cmd: 'matchReported', arg: 'draw' });
					}
					else
						chat.send(`You can just say 'I'/'we' (if you've won), 'he'/'they' (if you've lost) or 'draw' (if you've drew).`);
					break;
				case 'askForCancel':
					if (txt === 'y' || txt === 'yes' || txt === 'yep') {
						chat.send(`Ok man, I've just deleted your match!`);
						db.setLastCommand(user.id, { cmd: 'cancelMatch', arg: 'ok' });
					}
					else if (txt === 'n' || txt === 'no' || txt === 'nope') {
						chat.send(`I understand! Talk with your opponent, he's to give you the win or he must play!`);
						db.setLastCommand(user.id, { cmd: 'cancelMatch', arg: 'no' });
					}
					else
						chat.send(`You can just say 'yes' or 'no'.`);
					break;
				case 'started':
					if (txt === 'play') {
						if (!user.isPlaying) {
							chat.send(`Hey ${msg.author.username}, welcome to Baff Bot! I'll help you to play matches against other Discord users.\nWhat game do you want to play?\nThese are the supported games: ${supportedGamesToString()}`);
							db.setLastCommand(user.id, { cmd: 'askForGame', arg: '' });
						}
						else {
							chat.send(`**You are already in a match!** To quit type 'cancel'.`);
						}
					}
					else {
						chat.send(`Uhmmm don't know what you want :c Please type 'help' in order to get the list of the available commands!`);
					}
					break;
			}
		}
		else {
			if (txt === 'play') {
				if (!user.isPlaying) {
					chat.send(`Hey ${msg.author.username}, welcome to Baff Bot! I'll help you to play matches against other Discord users.\nWhat game do you want to play?\nThese are the supported games: ${supportedGamesToString()}`);
					db.setLastCommand(user.id, { cmd: 'askForGame', arg: '' });
				}
				else {
					chat.send(`**You are already in a match!** To quit type 'cancel'.`);
				}
			}
			else {
				chat.send(`Hey ${msg.author.username}, welcome to Baff Bot! I'll help you to play matches against other Discord users.\nTell me 'play' and you'll be asked some information to start looking for worthy players! Don't forget that if you have any problems, just type 'help'.\nMake sure to **allow friend request from ALL! It may happen that you see random numbers instead of user tag because of his privacy settings, so just copy his tag (as plain text) and manually search him.**`);
				db.setLastCommand(user.id, { cmd: 'started', arg: '' });
			}
		}
	}
}

function supportedGamesToString() {
	let str = '**';
	supportedGames.forEach((el, i) => {
		str += el.name;
		if (i != supportedGames.length - 1)
			str += ', ';
		else
			str += '**';
	});

	return str;
}

function supportedCommandsToString() {
	let str = '';
	supportedCommands.forEach((el, i) => {
		str += '**' + el.name + '** - ' + el.desc;
		if (i != supportedGames.length - 1)
			str += '\n';
	});

	return str;
}

function modesToString(modes) {
	let str = '**';
	modes.forEach((el, i) => {
		str += el;
		if (i != modes.length - 1)
			str += ', ';
		else
			str += '**';
	});

	return str;
}