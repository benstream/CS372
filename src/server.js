// server.js
// Benjamin Stream
// Solomon Himelbloom
// 2022-01-30

const express = require('express');
const parser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();

var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://127.0.0.1:27017/';

// ⚠️ User-specfic database & server connections.
const projDB = 'cs372'; 
const projTbl = 'user';

const hostname = '127.0.0.1';
const port = 8080;

app.use(parser.urlencoded({ extended: true }));

// TODO: Add salting and hashing with bcrypt.
app.post('/login', (req, res) => {
	var username = req.body.uid;
	var password = req.body.pwd;

	console.log(`\n--- CREDENTIALS ---`);
	console.log(`Plain Text Username: ${username}`);
	console.log(`Plain Text Password: ${password}`);

	res.send(`Username: ${req.body.uid} & Password: ${req.body.pwd}`);

	MongoClient.connect(url, function (err, db) {
		if (err) throw err;
		var dbo = db.db(projDB);
		var credentials = { uid: username, pwd: password };
		dbo.collection(projTbl).insertOne(credentials, function (err, res) {
			if (err) throw err;
			console.log('>> 1 account inserted.');
			db.close();
		});
	});
});

app.post('/registrationreq', (req, res) => {
	var username = req.body.uid;
	var password = req.body.pwd;
	var email = req.body.email;

	
	console.log(`\n--- CREDENTIALS ---`);
	console.log(`Plain Text Email: ${email}`);
	console.log(`Plain Text Username: ${username}`);
	console.log(`Plain Text Password: ${password}`);
	

	res.send(`Account Registered with Email: ${email} ,Username: ${username} & Password: ${password}`);

	MongoClient.connect(url, function (err, db) {
		if (err) throw err;
		var dbo = db.db(projDB);
		var query = { username: username };
		dbo.collection("Users").find(query).toArray(function (err, result) {
			if (err) throw err;
			console.log(result);
			db.close();

		});
			var user = { email: email, uid: username, pwd: password };
			dbo.collection("customers").insertOne(user, function (err, res) {
				if (err) throw err;
				console.log("1 document inserted");
				db.close();
			});
		
	});

});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/static/index.html');
});

app.get('/registration', (req, res) => {
	res.sendFile(__dirname + '/static/registration.html');
});

app.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});
