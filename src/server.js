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
let ejs = require('ejs');

const app = express();

// ⚠️ User-specfic database, server, & page connections:
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://127.0.0.1:27017/';

const projDB = 'cs372';
const projAuthTbl = 'user';
const projVaultTbl = 'media';

const hostname = '127.0.0.1';
const port = 8080;

const saltRounds = 12;

const staticPages = ['/registration', '/forgot', '/success', '/failure', '/exists'];

//'/content' taken out of protected pages for ejs

const protectedPages = ['/addition', '/removal', '/metadata', '/review', '/recommendation'];

app.use(parser.urlencoded({ extended: true }));

// Session Management
const store = new MongoDBSession({
	uri: url,
	collection: 'mySessions'
});

// FIXME: Add additional fields to session cookie.
app.use(
	session({
		secret: 'keyboard cat',
		resave: false,
		saveUninitialized: false,
		store: store
	})
);

// Account Management (Login)
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

						// ACCESS ROLES:
						// 1: Viewer
						// 2: Editor
						// 3: Manager

						req.session.user = {
							uid: user[0].uid,
							pwd: user[0].pwd,
							role: user[0].role
						};

						// Assigning role to localStorage
						// req.session.access = user[0].role;

						// TODO: Add additional fields to localStorage.
						if (user[0].role == 'manager') {
							req.session.access = 'manager';
						} else if (user[0].role == 'editor') {
							req.session.access = 'editor';
						} else if (user[0].role == 'viewer') {
							req.session.access = 'viewer';
						} else {
							req.session.access = 'viewer';
						}

						// Assigning role to localStorage
						// localStorage.setItem('role', req.session.access);
					}
				}
				db.close();
			});
	});
});

// Account Management (Logout) -- Remove session cookie.
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

		var description = {
			title: req.body.title,
			video: req.body.video,
			category: req.body.category,
			metadata: req.body.metadata,
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

// Query Movie Database [Title / Category / Metadata]
app.post('/search', (req, res) => {
	var query = req.body.query;
	console.log(query);
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;
		db.db(projDB)
			.collection(projVaultTbl)
			.find({
				$or: [
					{ title: { $regex: query, $options: 'i' } },
					{ category: { $regex: query, $options: 'i' } },
					{ metadata: { $regex: query, $options: 'i' } }
				]
			})
			.toArray((err, result) => {
				if (err) throw err;
				console.log('🔍 Search Query: ' + query);
				console.log(result);
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

// FIXME: Session Management (Cookies)
app.get('/', (req, res) => {
	req.session.isAuth = true;
	console.log(req.session);
	console.log('🍪: ' + req.session.id);
	res.sendFile(__dirname + '/static/index.html');
});

// Loading Static & Protected Pages
staticPages.forEach((page) => {
	app.get(page, (req, res) => {
		res.sendFile(__dirname + '/static' + page + '.html');
	});
});

// Render EJS Content page
app.get('/content', (req, res) => {
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;

		// Test Movie Query
		var movie = {
			title: 'YouTube Embedded Video Title',
			video: 'M7lc1UVf-VE',
			category: 'None',
			metadata: 'N/A',
			choice: false,
			views: 1337,
			rating: 4.97,
			review: 'Hello, world.'
		};

		res.render('content.ejs', {
			movie: movie
		});
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

// Render EJS Templates (Table View)
app.get('/dashboard', (req, res) => {
	MongoClient.connect(url, function (err, db) {
		if (err) throw err;
		db.db(projDB)
			.collection(projVaultTbl)
			.find({})
			.toArray((err, result) => {
				if (err) throw err;
				console.log(result);
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
