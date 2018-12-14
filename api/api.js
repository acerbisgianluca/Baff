// Express router
const express = require('express');
const router = express.Router();

// Cors middleware
const cors = require('cors');
router.use(cors({origin: true, credentials: true}));

let db;

// Session
const session = require('express-session');
const passport = require('passport');

// Passport Discord Strategy
const DiscordStrategy = require('passport-discord').Strategy;

// Passport serialize/deserialize
passport.serializeUser(function (user, done) {
	let dbUser = db.get('websiteUsers').find({ id: user.id }).value();
	if (dbUser) {
		db.get('websiteUsers').find({ id: user.id }).assign(user).write();
		done(null, user.id);
		return;
	}

	db.get('websiteUsers').push(user).write();
	done(null, user.id);
});
passport.deserializeUser(function (userId, done) {
	let dbUser = db.get('websiteUsers').find({ id: userId }).value();
	done(null, dbUser);
});

// Setting up Discord Strategy
const scopes = ['identify', 'email'];
passport.use(new DiscordStrategy({
	clientID: process.env.DISCORD_CLIENT_ID,
	clientSecret: process.env.DISCORD_SECRET,
	callbackURL: 'https://baffbot.acerbisgianluca.com/api/login/callback',
	scope: scopes
}, function (accessToken, refreshToken, profile, done) {
	let user = {
		id: profile.id,
		username: profile.username,
		email: profile.email,
		token: profile.accessToken,
	};
	done(null, user);
}));

router.use(session({
	secret: process.env.ENCRYPTION_KEY,
	resave: false,
	saveUninitialized: false
}));
router.use(passport.initialize());
router.use(passport.session());

router.get('/', function (req, res) {
	res.redirect("https://baff.acerbisgianluca.com");
});

router.get('/login', checkForLogin, passport.authenticate('discord', { scope: scopes }));

router.get('/login/callback',
	passport.authenticate('discord', { failureRedirect: "/" }), function (req, res) {
		res.redirect("https://baff.acerbisgianluca.com");
	}
);

router.get('/getMatches', checkAuth, (req, res) => {
	let matches = db.get('globalMatches').filter({ host: req.user.id }).value();
	matches.concat(db.get('globalMatches').filter({ opponent: req.user.id }).value());

	res.status(200).json(matches);
});

router.get('/me', checkAuth, (req, res) => {
	res.status(200).json(req.user);
});

router.get('/logout', function (req, res) {
	req.logout();
	res.redirect("https://baff.acerbisgianluca.com");
});

function checkAuth(req, res, next) {
	if (req.isAuthenticated())
		return next();
	res.redirect('/api/login');
}

function checkForLogin(req, res, next) {
	if (!req.isAuthenticated())
		return next();
	res.redirect("https://baff.acerbisgianluca.com");
}

module.exports = {
	router: router,
	setDb: globalDb => {
		db = globalDb;
	}
};