const express = require("express");
const cors = require("cors");
const { join } = require("path");
const listEndpoints = require("express-list-endpoints");
const mongoose = require("mongoose");

const articlesRouter = require("./services/articles/index");
const usersRouter = require("./services/users/index");

const { notFoundHandler, forbiddenHandler, badRequestHandler, genericErrorHandler } = require("./errorHandlers");

const passport = require("passport");

const oauth = require("./services/auth/oauth");

const cookieParser = require("cookie-parser");

const server = express();

const port = process.env.PORT || 3001;

const staticFolderPath = join(__dirname, "../public");

server.use(express.static(staticFolderPath));

server.use(express.json());

server.use(cookieParser());

const whitelist = [process.env.FE_PROD_URL, process.env.FE_DEV_URL];

const corsOptions = {
  origin: (origin, callback) => {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

server.use(cors(corsOptions));

server.use(passport.initialize());

server.use("/articles", articlesRouter);
server.use("/users", usersRouter);
// ERROR HANDLERS MIDDLEWARES

server.use(badRequestHandler);
server.use(notFoundHandler);
server.use(forbiddenHandler);
server.use(genericErrorHandler);

console.log(listEndpoints(server));

mongoose
  .connect(process.env.MONGO_CONNECTION, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(
    server.listen(port, () => {
      console.log("Running on port", port);
    })
  )
  .catch((err) => console.log(err));
