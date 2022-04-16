// server.js
// Benjamin Stream
// Solomon Himelbloom
// 2022-01-30

const express = require('express');
const session = require('express-session');
const MongoDBSession = require('connect-mongodb-session')(session);
const parser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
var favicon = require('serve-favicon');
let ejs = require('ejs');

const app = express();

// ⚠️ User-specfic database, server, & page connections:
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://127.0.0.1:27017/';

const projDB = 'cs372';
const projAuthTbl = 'user';
const sessionTbl = 'sessions';
const projVaultTbl = 'media';

/*
+-----------+--------+--------+--------+
| Page Name | Viewer | Editor | Manger |
+-----------+--------+--------+--------+
| Success   | ✅      | ✅     | ✅     |
+-----------+--------+--------+--------+
| Content   | ✅      | ❌     | ❌     |
+-----------+--------+--------+--------+
| Addition  | ❌      | ✅     | ❌     |
+-----------+--------+--------+--------+
| Removal   | ❌      | ✅     | ❌     |
+-----------+--------+--------+--------+
| Tags      | ❌      | ✅     | ❌     |
+-----------+--------+--------+--------+
| Dashboard | ❌      | ✅     | ✅     |
+-----------+--------+--------+--------+
| Review    | ❌      | ❌     | ✅     |
+-----------+--------+--------+--------+
*/

const viewerPages = ['/success', '/content'];
const editorPages = ['/success', '/content', '/addition', '/removal', '/metadata', '/dashboard'];
const managerPages = ['/success', '/content', '/dashboard', '/review'];

const staticPages = ['/registration', '/forgot', '/failure', '/exists'];
const protectedPages = ['/addition', '/removal', '/metadata', '/review'];

const hostname = '127.0.0.1';
const port = 8080;

const saltRounds = 12;

app.use(parser.urlencoded({ extended: true }));

// Add Global CSS Stylesheet
app.use('/css', express.static(__dirname + '/public/css'));

// Add Favicon
app.use(favicon(__dirname + '/public/images/favicon.ico'));

// Session Management
const store = new MongoDBSession({
	uri: url,
	databaseName: projDB,
	collection: sessionTbl
});

// Add additional fields to session cookie (httpOnly -> false).
app.use(
	session({
		cookie: {
			maxAge: 36000000,
			httpOnly: false
		},
		secret: 'keyboard cat',
		resave: false,
		saveUninitialized: false,
		store: store
	})
);

// Restrict pages from specific users.
app.use((req, res, next) => {
	store.get(req.session.id, function (error, session) {
		if (error) {
			res.status(500).send('⛔️ 500: Internal Server Error');
		} else if (viewerPages.includes(req.path) && req.session.user.access === 'viewer') {
			next();
		} else if (editorPages.includes(req.path) && req.session.user.access === 'editor') {
			next();
		} else if (managerPages.includes(req.path) && req.session.user.access === 'manager') {
			next();
		} else if (
			!viewerPages.includes(req.path) &&
			!editorPages.includes(req.path) &&
			!managerPages.includes(req.path)
		) {
			next();
		} else {
			res.status(403).send('❌ 403: Forbidden');
		}
	});
});

// Account Management (Login)
app.post('/login', (req, res) => {
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;
		db.db(projDB)
			.collection(projAuthTbl)
			.find({ uid: { $regex: req.body.uid, $options: 'i' } })
			.toArray((err, user) => {
				if (err) throw err;
				if (!user[0]) {
					res.redirect('/failure');
				} else {
					let verification = bcrypt.compareSync(req.body.pwd, user[0].pwd);
					if (verification == false) {
						res.redirect('/failure');
					} else {
						req.session.isAuth = true;
						req.session.user = {
							uid: user[0].uid,
							email: user[0].email,
							access: user[0].access
						};
						req.session.save();

						res.redirect('/success');
					}
				}
				db.close();
			});
	});
});

// Account Management (Logout): Remove session cookie.
app.get('/logout', (req, res) => {
	req.session.destroy();
	res.redirect('/');
});

// Account Management (Registration)
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
					.find({ uid: { $regex: req.body.uid, $options: 'i' } })
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

// Account Management (Password Reset)
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

// Adding Movies
app.post('/addition', (req, res) => {
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;

		// Segment the video URL from the id.
		if (req.body.video.includes('=')) {
			var split = req.body.video.split('=')[1];
		} else {
			var split = req.body.video;
		}

		var description = {
			title: req.body.title,
			video: split,
			category: req.body.category,
			metadata: req.body.metadata,
			choice: false,
			views: 0,
			likes: 0,
			rating: parseInt(req.body.rate),
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

// Removing Movies
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

// Updating Movie Tags
app.post('/metadata', (req, res) => {
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;
		db.db(projDB)
			.collection(projVaultTbl)
			.findOneAndUpdate(
				{ title: req.body.title },
				{ $set: { metadata: req.body.metadata, choice: req.body.choice } },
				function (err, res) {
					if (err) throw err;
					console.log('\n📝 Movie metadata has been updated!');
					db.close();
				}
			);
		res.redirect('/success');
	});
});

// Updating Movie Reviews
app.post('/review', (req, res) => {
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;
		db.db(projDB)
			.collection(projVaultTbl)
			.findOneAndUpdate(
				{ title: req.body.title },
				{ $set: { review: req.body.review } },
				function (err, res) {
					if (err) throw err;
					console.log('\n>> Movie review has been added!');
					db.close();
				}
			);
		res.redirect('/success');
	});
});

// Capture User Ratings
app.post('/thumbs', (req, res) => {
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;
		db.db(projDB)
			.collection(projVaultTbl)
			.findOneAndUpdate({ video: req.query.id }, { $inc: { likes: 1 } }, function (err, res) {
				if (err) throw err;
				else {
					console.log('\n>> Movie likes has been updated!');
					db.close();
				}
			});
	});
});

// Query Movie Database [Title / Category / Metadata]
app.post('/search', (req, res) => {
	var query = req.body.query;
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;
		db.db(projDB)
			.collection(projVaultTbl)
			.find({
				$or: [
					{ title: { $regex: query, $options: 'i' } },
					{ category: { $regex: query, $options: 'i' } },
					{ metadata: query }
				]
			})
			.toArray((err, result) => {
				if (err) throw err;
				db.close();

				if (result.length === 0) {
					res.send('👀 No results found -- please try again.');
				} else {
					res.render('results.ejs', {
						results: result
					});
				}
			});
	});
});

// Loading Static & Protected Pages
staticPages.forEach((page) => {
	app.get(page, (req, res) => {
		res.sendFile(__dirname + '/static' + page + '.html');
	});
});

protectedPages.forEach((page) => {
	app.get(page, (req, res) => {
		if (req.session.isAuth) {
			res.sendFile(__dirname + '/protected' + page + '.html');
		} else {
			res.redirect('/');
		}
	});
});

// Render EJS Content page
app.get('/content', (req, res) => {
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;
		db.db(projDB)
			.collection(projVaultTbl)
			.find({ video: req.query.id })
			.toArray((err, result) => {
				if (err) throw err;
				db.close();
				res.render('content.ejs', {
					movie: result[0]
				});
			});
	});
});

// Static Login Page
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/static/index.html');
});

// Show the EJS success page
app.get('/success', (req, res) => {
	store.get(req.session.id, function (error, session) {
		if (error) {
			res.status(500).send(error);
			return;
		} else {
			res.render('success.ejs', {
				uid: req.session.user.uid,
				access: req.session.user.access
			});
		}
	});
});

// Render EJS Templates (Table View)
app.get('/dashboard', (req, res) => {
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;
		db.db(projDB)
			.collection(projVaultTbl)
			.find({})
			.toArray((err, result) => {
				if (err) throw err;
				db.close();
				res.render('dashboard.ejs', {
					title: 'Movie Vault',
					movies: result
				});
			});
	});
});

// Local Server Output
app.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});
