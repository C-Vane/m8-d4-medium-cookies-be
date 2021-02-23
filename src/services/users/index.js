const express = require("express");

const UserSchema = require("./schema");

const usersRouter = express.Router();

const { authorize } = require("../auth/middleware");

const { authenticate, refreshToken } = require("../auth/tools");

const passport = require("passport");

//GOOGLE LOG IN

usersRouter.get("/googleLogin", passport.authenticate("google", { scope: ["profile", "email"] }));

usersRouter.get("/googleRedirect", passport.authenticate("google"), async (req, res, next) => {
  try {
    res.cookie("token", req.user.tokens.token, {
      httpOnly: true,
    });
    res.cookie("refreshToken", req.user.tokens.refreshToken, {
      httpOnly: true,
      path: "/users/refreshToken",
    });

    res.status(200).redirect(process.env.FE_PROD_URL || process.env.FE_DEV_URL);
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/register", async (req, res, next) => {
  try {
    const newUser = new UserSchema({ img: "https://thumbs.dreamstime.com/b/default-avatar-profile-trendy-style-social-media-user-icon-187599373.jpg", ...req.body });
    const { _id } = await newUser.save();
    res.status(201).send({ _id });
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await UserSchema.findByCredentials(email, password);
    if (user) {
      const tokens = await authenticate(user);
      res.cookie("token", tokens.token, {
        httpOnly: true,
      });
      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        path: "/users/refreshToken",
      });
      res.status(201).send({ ok: true });
    } else {
      const err = new Error("User with email and password not found");
      err.status = 401;
      next(err);
    }
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/logOut", authorize, async (req, res, next) => {
  try {
    if (req.token) {
      req.user.refreshTokens = req.user.refreshTokens.filter((t) => t.token !== req.token);
      await req.user.save();
      res.cookie("token", "", {
        httpOnly: true,
      });
      res.cookie("refreshToken", "", {
        httpOnly: true,
        path: "/users/refreshToken",
      });
      res.status(201).send({ ok: true });
    } else {
      const err = new Error("Token not provided");
      err.status = 401;
      next(err);
    }
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/logOutAll", authorize, async (req, res, next) => {
  try {
    req.user.refreshTokens = [];
    await req.user.save();
    res.status(201).send({ ok: true });
  } catch (error) {
    next(error);
  }
});
usersRouter.post("/refreshToken", async (req, res, next) => {
  const oldRefreshToken = req.cookies.refreshToken;
  if (!oldRefreshToken) {
    const err = new Error("Refresh token missing");
    err.httpStatusCode = 400;
    next(err);
  } else {
    try {
      const newTokens = await refreshToken(oldRefreshToken);
      if (newTokens) {
        res.cookie("token", newTokens.token, {
          httpOnly: true,
        });
        res.cookie("refreshToken", newTokens.refreshToken, {
          httpOnly: true,
          path: "/users/refreshToken",
        });
        res.status(201).send({ ok: true });
      } else {
        const err = new Error("Provided refresh tocken is incorrect");
        err.httpStatusCode = 403;
        next(err);
      }
    } catch (error) {
      next(error);
    }
  }
});

usersRouter.get("/", async (req, res, next) => {
  try {
    const users = await UserSchema.find(req.query.search && { $text: { $search: req.query.search } })
      .sort({ createdAt: -1 })
      .skip(req.query.page && (req.query.page - 1) * 10)
      .limit(10);
    res.send(users);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/me", authorize, async (req, res, next) => {
  try {
    if (req.user) {
      const user = await UserSchema.findById(req.user._id).populate("articles");
      res.send(user);
    } else {
      const error = new Error();
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    console.log(error);
    next("While reading users list a problem occurred!");
  }
});

usersRouter.put("/me", authorize, async (req, res, next) => {
  try {
    if (req.user) {
      const updates = Object.keys(req.body);
      updates.forEach((update) => (req.user[update] = req.body[update]));
      await req.user.save();
      res.send(req.user);
    } else {
      const error = new Error(`user with id ${req.params.id} not found`);
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    next(error);
  }
});

usersRouter.delete("/me", authorize, async (req, res, next) => {
  try {
    if (req.user) {
      await req.user.deleteOne(res.send("Deleted"));
    } else {
      const error = new Error(`user with id ${req.params.id} not found`);
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = usersRouter;
