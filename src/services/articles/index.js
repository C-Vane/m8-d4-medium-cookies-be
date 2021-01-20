const { text } = require("express");
const express = require("express");
const { Mongoose, Types } = require("mongoose");

const ArticleSchema = require("./schema");
const UserSchema = require("./schema");

const articlesRouter = express.Router();

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

articlesRouter.post("/", async (req, res, next) => {
  try {
    const newarticle = new ArticleSchema(req.body);
    const { _id } = await newarticle.save();
    await UserSchema.findByIdAndUpdate(
      req.body.author,
      { $push: { articles: _id } },
      {
        runValidators: true,
        new: true,
      }
    );
    res.status(201).send(_id);
  } catch (error) {
    next(error);
  }
});

articlesRouter.put("/:id", async (req, res, next) => {
  try {
    const article = await ArticleSchema.findByIdAndUpdate(req.params.id, req.body, {
      runValidators: true,
      new: true,
    });
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

articlesRouter.delete("/:id", async (req, res, next) => {
  try {
    const { author } = await ArticleSchema.findById(req.params.id);
    await UserSchema.findByIdAndUpdate(
      author._id,
      { $pull: { articles: req.params.id } },
      {
        runValidators: true,
        new: true,
      }
    );
    const article = await ArticleSchema.findByIdAndDelete(req.params.id);
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
articlesRouter.post("/:id/reviews", async (req, res, next) => {
  try {
    const article = await ArticleSchema.findByIdAndUpdate(
      req.params.id,
      { $push: { reviews: { ...req.body, createdAt: new Date() } } },
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
articlesRouter.put("/:id/reviews/:reviewID", async (req, res, next) => {
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
    if (reviews[0]) {
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
articlesRouter.delete("/:id/reviews/:reviewID", async (req, res, next) => {
  try {
    const id = req.params.id;
    const rId = req.params.reviewID;

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
  } catch (error) {
    next(error);
  }
});

//claps
articlesRouter.post("/:id/claps", async (req, res, next) => {
  try {
    const article = await ArticleSchema.findByIdAndUpdate(
      req.params.id,
      { $push: { claps: req.body._id } },
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
