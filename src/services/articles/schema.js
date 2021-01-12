const { Schema } = require("mongoose");
const mongoose = require("mongoose");

const ArticleSchema = new Schema(
  {
    headLine: {
      type: String,
      required: true,
    },
    subHead: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    category: {
      name: {
        type: String,
        required: true,
      },
      img: {
        type: String,
        required: true,
      },
    },
    author: {
      name: {
        type: String,
        required: true,
      },
      img: {
        type: String,
        required: true,
      },
    },
    cover: {
      type: String,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Article", ArticleSchema);
