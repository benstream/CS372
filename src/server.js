// app.js
// Benjamin Stream
// Solomon Himelbloom
// 2022-01-30

const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const parser = require('body-parser');

app.use(express.json());
app.use(parser.urlencoded({ extended: false }));

const hostname = '127.0.0.1';
const port = 8080;

// TODO: Transition to MongoDB.
const users = [];

app.get('/users', (req, res) => {
	res.json(users);
});

app.post('/users', async (req, res) => {
	try {
		const hashed = await bcrypt.hash(req.body.password, 10);
		const user = { name: req.body.name, password: hashed };
		users.push(user);
		res.status(201).send();
	} catch {
		res.status(500).send();
	}
});

app.post('/users/login', async (req, res) => {
	const user = users.find((user) => user.name === req.body.name);
	if (user == null) {
		return res.status(400).send('Cannot find user');
	}
	try {
		if (await bcrypt.compare(req.body.password, user.password)) {
			res.send('Success');
		} else {
			res.send('Not Allowed');
		}
	} catch {
		res.status(500).send();
	}
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/static/index.html')
});

app.get('/login', (req, res) => {
	res.sendFile(__dirname + '/static/login.html')
});

// app.post('/login', (req, res) => {
// 	let username = req.body.uid
// 	let password = req.body.pwd
// 	res.send(`Username: ${username} Password: ${password}`)
// });

app.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`)
})