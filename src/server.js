// server.js
// Benjamin Stream
// Solomon Himelbloom
// 2022-01-30

const express = require('express');
const parser = require('body-parser');
const bcrypt = require('bcrypt');
const { redirect } = require('express/lib/response');

const app = express();

var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://127.0.0.1:27017/';

// ⚠️ User-specfic database & server connections:
const projDB = 'cs372';
const projTbl = 'user';

const hostname = '127.0.0.1';
const port = 8080;

const saltRounds = 12;

app.use(parser.urlencoded({ extended: true }));

app.post('/login', (req, res) => {
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;
		db.db(projDB)
			.collection(projTbl)
			.find({ uid: req.body.uid })
			.toArray((err, user) => {
				if (err) throw err;
				if (!user[0]) {
					res.redirect('/failure');
				} else {
					let verification = bcrypt.compareSync(req.body.pwd, user[0].pwd);
					if (verification == false) {
						res.redirect('/failure');
					} else {
						res.redirect('/success');
					}
				}
				db.close();
			});
	});
});

app.post('/registrationreq', (req, res) => {
	bcrypt.genSalt(saltRounds, function (err, salt) {
		bcrypt.hash(req.body.pwd, salt, function (err, hash) {
			MongoClient.connect(url, function (err, db) {
				if (err) throw err;
				var credentials = { email: req.body.email, uid: req.body.uid, pwd: hash };

				// Check if account already exists:
				db.db(projDB)
					.collection(projTbl)
					.find({ uid: req.body.uid })
					.toArray((err, user) => {
						if (err) throw err;
						if (user[0]) {
							console.log('\n>> Account Exists.');
							db.close();
						} else {
							db.db(projDB)
								.collection(projTbl)
								.insertOne(credentials, function (err, res) {
									if (err) throw err;
									console.log('\n>> 1 account inserted.');
									db.close();
									res.redirect('/');
								});
						}
					});
			});
		});
	});
});

app.post('/passwordreset', (req, res) => {
	var username = req.body.uid;
	var newPassword = req.body.pwd;
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/static/index.html');
});

app.get('/registration', (req, res) => {
	res.sendFile(__dirname + '/static/registration.html');
});

app.get('/forgotpassword', (req, res) => {
	res.sendFile(__dirname + '/static/forgotpass.html');
});

app.get('/success', (req, res) => {
	res.sendFile(__dirname + '/static/success.html');
});

app.get('/failure', (req, res) => {
	res.sendFile(__dirname + '/static/failure.html');
});

app.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});
