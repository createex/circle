//NPM Packages
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const app = express();
//const http = require("http");
//const server = http.createServer(app);


//Project files and routes
const apiRouter = require("./Routes");
const connect = require("./Config/db");
//const socketIO = require("./socket");

//connect to database
connect();

//Middlwares
app.use(bodyParser.json());
app.use(cors());

//connecting routes
app.use("/api", apiRouter);

//Connect Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Your app is running on PORT ${PORT}`);
});