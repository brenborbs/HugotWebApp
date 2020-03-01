const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const postSchema = new mongoose.Schema({
  about: {
    type: String,
    trim: true,
    min: 3,
    max: 160,
    required: true
  },
  author: {
    type: String,
    trim: true,
    min: 3,
    max: 160,
    required: true
  },
  slug: {
    type: String,
    unique: true,
    index: true
  },
  body: {
    type: {},
    required: true,
    min: 80,
    max: 200
  },
  excerpt: {
    type: String,
    max: 1000
  },
  mabout: {
    type: String
  },
  mdesc: {
    type: String
  },
  photo: {
    data: Buffer,
    contentType: String
  },
  source: {
    required: false,
    type: Boolean
  },
  verification: {
    required: false,
    type: Boolean
  },
  categories: [{ type: ObjectId, ref: "Category", required: true }],
  tags: [{ type: ObjectId, ref: "Tag", required: true }],
  postedBy: {
    type: ObjectId,
    ref: "User"
  }
});

module.exports = mongoose.model("Post", postSchema);
