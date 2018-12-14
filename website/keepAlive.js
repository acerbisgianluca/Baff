const fs = require("fs");
const express = require('express');
const app = express();
const PORT = process.env.PORT;

const api = require('../api/api.js');
app.use('/api', api.router);

app.get('/', (req, res) => res.sendFile('index.html' , { root : __dirname}));

app.listen(8080, console.log('App is listening on ' + PORT));

module.exports = {
	server: app,
	setDb: db => {
		api.setDb(db);
	}
};