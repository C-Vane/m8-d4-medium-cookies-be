const { Schema } = require("mongoose");
const mongoose = require("mongoose");

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    img: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("User", UserSchema);
