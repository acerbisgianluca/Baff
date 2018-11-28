const fs = require("fs");
const express = require('express');
const app = express();
const PORT = process.env.PORT;

app.get('/', (req, res) => res.sendFile('index.html' , { root : __dirname}));

app.listen(8080, console.log('App is listening on ' + PORT));

module.exports = app;