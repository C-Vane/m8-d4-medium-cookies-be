const express = require("express");

const { Mongoose, Types } = require("mongoose");

const ArticleSchema = require("./schema");

const UserSchema = require("../users/schema");

const articlesRouter = express.Router();

const { authorize } = require("../auth/middleware");

articlesRouter.get("/", async (req, res, next) => {
  try {
    const articles = await ArticleSchema.find(req.query.search && { $text: { $search: req.query.search } })
      .sort({ createdAt: -1 })
      .skip(req.query.page && (req.query.page - 1) * 10)
      .limit(10)
      .populate("author", "name surname img");
    res.send(articles);
  } catch (error) {
    next(error);
  }
});

articlesRouter.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const article = await ArticleSchema.findById(id).populate("author", "name surname img").populate("claps", "name surname img").populate("reviews.author", "name surname img");
    if (article) {
      res.send(article);
    } else {
      const error = new Error();
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    console.log(error);
    next("While reading articles list a problem occurred!");
  }
});

articlesRouter.post("/", authorize, async (req, res, next) => {
  try {
    const newarticle = new ArticleSchema({ ...req.body, author: req.user._id });
    const { _id } = await newarticle.save();
    await UserSchema.findByIdAndUpdate(
      req.user._id,
      { $push: { articles: _id } },
      {
        runValidators: true,
        new: true,
      }
    );
    res.status(201).send({ _id });
  } catch (error) {
    next(error);
  }
});

articlesRouter.put("/:id", authorize, async (req, res, next) => {
  try {
    const article = await ArticleSchema.findOneAndUpdate({ _id: req.params.id, author: req.user._id }, req.body, {
      runValidators: true,
      new: true,
    });
    if (article) {
      res.send(article);
    } else {
      const error = new Error(`article with id ${req.params.id} not found or unauthorized to make changes`);
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    next(error);
  }
});

articlesRouter.delete("/:id", authorize, async (req, res, next) => {
  try {
    await UserSchema.findByIdAndUpdate(
      req.user._id,
      { $pull: { articles: req.params.id } },
      {
        runValidators: true,
        new: true,
      }
    );
    const article = await ArticleSchema.findOneAndDelete({ _id: req.params.id, author: req.user._id });
    if (article) {
      res.send({ ...article, ok: true });
    } else {
      const error = new Error(`article with id ${req.params.id} not found`);
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    next(error);
  }
});

///Reviews
// get a review for a specific article
articlesRouter.get("/:id/reviews", async (req, res, next) => {
  try {
    const id = req.params.id;
    const { reviews } = await ArticleSchema.findById(id)
      .sort({ createdAt: -1 })
      .skip(req.query.page && (req.query.page - 1) * 10)
      .limit(10)
      .populate("reviews.author", "name surname img");

    if (reviews) {
      res.send(reviews);
    } else {
      const error = new Error(`No reviews for article with id ${req.params.id} were found`);
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    console.log(error);
    next("While reading articles list a problem occurred!");
  }
});
// get a specific review by id
articlesRouter.get("/:id/reviews/:reviewID", async (req, res, next) => {
  try {
    const id = req.params.id;
    const rId = req.params.reviewID;
    const { reviews } = await ArticleSchema.findOne(
      { _id: Types.ObjectId(id) },
      {
        reviews: {
          $elemMatch: { _id: Types.ObjectId(rId) },
        },
      }
    ).populate("reviews.author", "name surname img");
    if (reviews) {
      res.send(reviews[0]);
    } else {
      const error = new Error(`No reviews for article with id ${req.params.id} were found`);
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    console.log(error);
    next("While reading articles list a problem occurred!");
  }
});
//post a review
articlesRouter.post("/:id/reviews", authorize, async (req, res, next) => {
  try {
    const article = await ArticleSchema.findByIdAndUpdate(
      req.params.id,
      { $push: { reviews: { ...req.body, createdAt: new Date(), author: req.user._id } } },
      {
        runValidators: true,
        new: true,
      }
    )
      .populate("author", "name surname img")
      .populate("claps", "name surname img")
      .populate("reviews.author", "name surname img");
    if (article) {
      res.send(article);
    } else {
      const error = new Error(`article with id ${req.params.id} not found`);
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    next(error);
  }
});
//Edit A review
articlesRouter.put("/:id/reviews/:reviewID", authorize, async (req, res, next) => {
  try {
    const id = req.params.id;
    const rId = req.params.reviewID;
    const { reviews } = await ArticleSchema.findOne(
      { _id: Types.ObjectId(id) },
      {
        reviews: {
          $elemMatch: { _id: Types.ObjectId(rId) },
        },
      }
    );
    if (reviews[0] && reviews[0].author === req.user._id) {
      const currentReview = { ...reviews[0].toObject(), ...req.body, lastUpdated: new Date() };
      const article = await ArticleSchema.findOneAndUpdate(
        { _id: Types.ObjectId(id), "reviews._id": Types.ObjectId(rId) },
        { $set: { "reviews.$": currentReview } },
        {
          runValidators: true,
          new: true,
        }
      )
        .populate("author", "name surname img")
        .populate("claps", "name surname img")
        .populate("reviews.author", "name surname img");

      if (article) {
        res.send(article);
      } else {
        const error = new Error(`No reviews for article with id ${req.params.id} were found`);
        error.httpStatusCode = 404;
        next(error);
      }
    } else {
      const error = new Error(`No reviews for article with id ${req.params.id} were found`);
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    next(error);
  }
});

articlesRouter.delete("/:id/reviews/:reviewID", authorize, async (req, res, next) => {
  try {
    const id = req.params.id;
    const rId = req.params.reviewID;
    const { reviews } = await ArticleSchema.findOne(
      { _id: Types.ObjectId(id) },
      {
        reviews: {
          $elemMatch: { _id: Types.ObjectId(rId) },
        },
      }
    );
    if (reviews[0] && reviews[0].author === req.user._id) {
      const article = await ArticleSchema.findByIdAndUpdate(
        id,
        { $pull: { reviews: { _id: Types.ObjectId(rId) } } },
        {
          new: true,
        }
      )
        .populate("author", "name surname img")
        .populate("claps", "name surname img")
        .populate("reviews.author", "name surname img");
      if (article) {
        res.send(article);
      } else {
        const error = new Error(`No reviews for article with id ${req.params.id} were found`);
        error.httpStatusCode = 404;
        next(error);
      }
    } else {
      const error = new Error(`No reviews for article with id ${req.params.id} were found or not allowed to make changes`);
      error.httpStatusCode = 403;
      next(error);
    }
  } catch (error) {
    next(error);
  }
});

//claps
articlesRouter.post("/:id/clap", authorize, async (req, res, next) => {
  try {
    const article = await ArticleSchema.findByIdAndUpdate(
      req.params.id,
      { $push: { claps: req.user._id } },
      {
        runValidators: true,
        new: true,
      }
    )
      .populate("author", "name surname img")
      .populate("claps", "name surname img")
      .populate("reviews.author", "name surname img");
    if (article) {
      res.send(article);
    } else {
      const error = new Error(`article with id ${req.params.id} not found`);
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    next(error);
  }
});
module.exports = articlesRouter;
