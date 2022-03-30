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
const querystring = require('querystring');
const MongoDBSession = require('connect-mongodb-session')(session);
const passport = require('passport');
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

const staticPages = ['/registration', '/forgot', '/failure', '/exists'];
const protectedPages = ['/addition', '/removal', '/metadata', '/review'];

const hostname = '127.0.0.1';
const port = 8080;

const saltRounds = 12;

app.use(parser.urlencoded({ extended: true }));

// Session Management
//const store = new session.MemoryStore();
const store = new MongoDBSession({
	uri: url,
	collection: 'mySessions'
});

// Add additional fields to session cookie.
app.use(
	session({
		cookie: {
			maxAge: 36000000,
			httpOnly: false // <- set httpOnly to false
		},
		secret: 'keyboard cat',
		resave: false,
		saveUninitialized: false,
		store: store
	})
);

// TODO (Solomon):
// - Add a page to the database that will be accessible by all users (or subsection).
// - Restrict the page to the appropriate user roles.
// - Experiment with cookies for local storage.
// - User Routes (Login, Registration, etc.)

// Allow access to only specific pages
app.use((req, res, next) => {
	if (staticPages.includes(req.path)) {
		next();
	} else if (protectedPages.includes(req.path)) {
		if (req.session.user) {
			next();
		} else {
			// Return a response with no access
			res.redirect('/403');
			console.log('🔐 User not logged in.');
		}
	} else {
		next();
	}
});

// Allow content editor to access the following pages:
// 1. Movie Dashboard
// 2. Movie Review
// 3. Movie Recommendation
// app.use((req, res, next) => {
// 	if (req.session.user.role === 'editor') {
// 		if (req.path === '/dashboard' || req.path === '/review' || req.path === '/recommendation') {
// 			next();
// 		} else {
// 			res.redirect('/404');
// 			console.log('🔐 User not authorized.');
// 		}
// 	} else {
// 		next();
// 	}
// });

// Allow managers to add and remove media
app.use((req, res, next) => {
	if (req.path === '/addition') {
		if (req.session.user.access === 'manager') {
			next();
		} else {
			res.redirect('/403');
			console.log('🔐 User not logged in.');
		}
	} else if (req.path === '/removal') {
		if (req.session.user.access === 'manager') {
			next();
		} else {
			res.redirect('/403');
			console.log('🔐 User not logged in.');
		}
	} else {
		next();
	}
});

// Assign pages to database role access levels (MongoDB)
app.use((req, res, next) => {
	if (req.session.user) {
		MongoClient.connect(url, function (err, db) {
			if (err) throw err;
			db.db(projDB)
				.collection(projAuthTbl)
				.findOne({ username: req.session.user.username }, function (err, result) {
					if (err) throw err;
					req.session.user.access = result.access;
					next();
				});
		});
	} else {
		next();
	}
});

// * OTHER INFORMAITON (SUPPLEMENTAL):
// app.use(function(req, res, next) {
// 	if (staticPages.includes(req.path)) {
// 		next();
// 	} else if (protectedPages.includes(req.path)) {
// 		if (req.session.user) {
// 			next();
// 		} else {
// 			res.redirect('/login');
// 		}
// 	} else {
// 		next();
// 	}
// });

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

						req.session.isAuth = true;
						req.session.user = {
							uid: user[0].uid,
							email: user[0].email,
							pwd: user[0].pwd,
							access: user[0].access
						};
						req.session.save();
						console.log(JSON.stringify(req.session.user));
						
						//if (user[0].role == 'manager') {
						//	req.session.access = 'manager';
						//} else if (user[0].role == 'editor') {
						//	req.session.access = 'editor';
						//} else if (user[0].role == 'viewer') {
						//	req.session.access = 'viewer';
						//} else {
						//	req.session.access = 'viewer';
						//}
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
			choice: false,
			views: 0,
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

// Session Management (Cookies)
app.get('/', (req, res) => {
	//req.session.isAuth = false;
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
		db.db(projDB)
			.collection(projVaultTbl)
			.find({ video: req.query.id })
			.toArray((err, result) => {
				if (err) throw err;
				console.log(result);
				db.close();
				res.render('content.ejs', {
					movie: result[0]
				});
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

// Show the EJS success page
app.get('/success', (req, res) => {

	res.render('success.ejs',
		{
			user: req.session.user.uid,
			email: req.session.user.email,
			access: req.session.user.access
		}
		);


	//MongoClient.connect(url, function (err, db) {
	//	if (err) throw err;
	//	db.db(projDB)
	//		.collection('mySessions')
	//		.find({ _id : req.session.id})
	//		.toArray((err, result) => {
	//			if (err) throw err;
	//			console.log(result);
	//			res.render('success.ejs',
	//				{
	//					user: result[0].uid,
	//					email: result[0].email,
	//					access: result[0].access
	//				});
	//			db.close();
	//		});

	//});
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
