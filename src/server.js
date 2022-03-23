// server.js
// Benjamin Stream
// Solomon Himelbloom
// 2022-01-30
//
// TODO:
// - Assign Express to the session (cookie)
// - Attach the session to website middleware
// - Show pages to the local account based on user roles
// - Update the following user to the new database access system
// - Specific pages that are only accessible by editors & admins

const express = require('express');
const session = require('express-session');
const MongoDBSession = require('connect-mongodb-session')(session);
const parser = require('body-parser');
const bcrypt = require('bcrypt');
const { redirect } = require('express/lib/response');

const app = express();

// ⚠️ User-specfic database & server connections:
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://127.0.0.1:27017/';

const projDB = 'cs372';
const projAuthTbl = 'user';
const projVaultTbl = 'media';

const hostname = '127.0.0.1';
const port = 8080;

const saltRounds = 12;

app.use(parser.urlencoded({ extended: true }));

// Session Management

const store = new MongoDBSession({
	uri: url,
	collection: 'mySessions'
});
app.use(
	session({
		secret: 'keyboard cat',
		resave: false,
		saveUninitialized: false,
		store: store
	})
);

// FIXME: Add additional fields to session cookie.
// res.setHeader('Content-Type', 'text/html');
// res.setHeader('Set-Cookie', 'foo=bar; Path=/; HttpOnly');
// res.cookie('name', 'test', { domain: 'example.com', path: '/admin', secure: true });

app.post('/login', (req, res) => {
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;
		db.db(projDB)
			.collection(projAuthTbl)
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
						// Assigning role to localStorage
						// localStorage.setItem('role', user[0].access);
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
				var credentials = {
					email: req.body.email,
					uid: req.body.uid,
					pwd: hash,
					access: req.body.access
				};
				db.db(projDB)
					.collection(projAuthTbl)
					.find({ uid: req.body.uid })
					.toArray((err, user) => {
						if (err) throw err;
						if (user[0]) {
							db.close();
							res.redirect('/exists');
						} else {
							db.db(projDB)
								.collection(projAuthTbl)
								.insertOne(credentials, function (err, res) {
									if (err) throw err;
									console.log('\n>> 1 account inserted.');
									db.close();
								});
							res.redirect('/');
						}
					});
			});
		});
	});
});

app.post('/passwordreset', (req, res) => {
	bcrypt.genSalt(saltRounds, function (err, salt) {
		bcrypt.hash(req.body.pwd, salt, function (err, newHash) {
			MongoClient.connect(url, function (err, db) {
				if (err) throw err;
				db.db(projDB)
					.collection(projAuthTbl)
					.findOneAndUpdate({ uid: req.body.uid }, { $set: { pwd: newHash } }, function (err, res) {
						if (err) throw err;
						console.log('\n>> User has been updated!');
						db.close();
					});
				res.redirect('/');
			});
		});
	});
});

app.post('/addition', (req, res) => {
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;

		var description = {
			title: req.body.title,
			video: req.body.video,
			category: req.body.category,
			metadata: req.body.metadata,
			rating: req.body.rate,
			review: req.body.review
		};

		db.db(projDB)
			.collection(projVaultTbl)
			.find({ title: req.body.title })
			.toArray((err, movie) => {
				if (err) throw err;
				if (movie[0]) {
					db.close();
					res.send('(!) Movie already exists -- please try again.');
				} else {
					db.db(projDB)
						.collection(projVaultTbl)
						.insertOne(description, function (err, res) {
							if (err) throw err;
							console.log('\n>> 1 movie inserted.');
							db.close();
						});
					res.redirect('/success');
				}
			});
	});
});

app.post('/removal', (req, res) => {
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;
		db.db(projDB)
			.collection(projVaultTbl)
			.findOneAndDelete({ title: req.body.title }, function (err, res) {
				if (err) throw err;
				console.log('\n>> Movie has been removed!');
				db.close();
			});
		res.redirect('/success');
	});
});

app.post('/metadata', (req, res) => {
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;
		db.db(projDB)
			.collection(projVaultTbl)
			.findOneAndUpdate(
				{ title: req.body.title },
				{ $set: { metadata: req.body.metadata } },
				function (err, res) {
					if (err) throw err;
					console.log('\n>> Movie metadata has been updated!');
					db.close();
				}
			);
		res.redirect('/success');
	});
});

app.get('/', (req, res) => {
	req.session.isAuth = true;
	console.log(req.session);
	console.log('🍪: ' + req.session.id);
	res.sendFile(__dirname + '/static/index.html');
});

// Static Pages
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

app.get('/exists', (req, res) => {
	res.sendFile(__dirname + '/static/exists.html');
});

// Protected Pages
app.get('/content', (req, res) => {
	res.sendFile(__dirname + '/protected/content.html');
});

app.get('/recommendation', (req, res) => {
	res.sendFile(__dirname + '/protected/recommendation.html');
});

app.get('/review', (req, res) => {
	res.sendFile(__dirname + '/protected/review.html');
});

app.get('/addition', (req, res) => {
	res.sendFile(__dirname + '/protected/addition.html');
});

app.get('/removal', (req, res) => {
	res.sendFile(__dirname + '/protected/removal.html');
});

app.get('/metadata', (req, res) => {
	res.sendFile(__dirname + '/protected/metadata.html');
});

app.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});
