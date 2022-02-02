// app.js
// Benjamin Stream
// Solomon Himelbloom
// 2022-01-30

const express = require("express")
const app = express()
const parser = require("body-parser")

app.use(parser.urlencoded({ extended: false }))

const hostname = "127.0.0.1";
const port = 8080;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/static/index.html');
})

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/static/login.html');
})

app.post('/login', (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  res.send(`Username: ${username} Password: ${password}`);
})

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
