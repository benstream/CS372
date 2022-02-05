// server.js
// Benjamin Stream
// Solomon Himelbloom
// 2022-01-30

const express = require('express');
const parser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();

app.use(parser.urlencoded({ extended: true }));

const hostname = '127.0.0.1';
const port = 8080;

// TODO: Add salting and hashing with bcrypt.
app.post('/login', (req, res) => {
	console.log(`\n--- CREDENTIALS ---`);
	console.log(`Plain Text Password: ${req.body.pwd}`);
	res.send(`Username: ${req.body.uid} | Password: ${req.body.pwd}`);
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/static/index.html');
});

app.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});
