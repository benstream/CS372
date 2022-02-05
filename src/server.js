// app.js
// Benjamin Stream
// Solomon Himelbloom
// 2022-01-30

const express = require('express');
const parser = require('body-parser');

const app = express();

app.use(parser.urlencoded({ extended: true }));

const hostname = '127.0.0.1';
const port = 8080;

app.post('/login', (req, res) => {
  console.log(`${req.body.uid}`);
  res.send(`Credentials: ${req.body.uid} ${req.body.pwd}`);
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/static/index.html');
});

app.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});
