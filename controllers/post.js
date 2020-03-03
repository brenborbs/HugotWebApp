const Post = require("../models/post");
const Category = require("../models/category");
const Tag = require("../models/tag");
const User = require("../models/user");
const formidable = require("formidable");
const slugify = require("slugify");
const stripHtml = require("string-strip-html");
const _ = require("lodash");
const { errorHandler } = require("../helpers/dbErrorHandler");
const fs = require("fs");
const { smartTrim } = require("../helpers/post");

exports.create = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Image could not upload"
      });
    }

    const { about, author, body, categories, tags } = fields;

    // about, body , categories custom validation
    if (!about || !about.length) {
      return res.status(400).json({
        error: "About is required"
      });
    }

    if (!author || !author.length) {
      return res.status(400).json({
        error: "Author is required"
      });
    }

    if (!body || body.length < 10) {
      return res.status(400).json({
        error: "Content is too short"
      });
    }

    if (!categories || categories.length === 0) {
      return res.status(400).json({
        error: "At least one category is required"
      });
    }

    if (!tags || tags.length === 0) {
      return res.status(400).json({
        error: "At least one tag is required"
      });
    }

    let post = new Post();
    post.about = about;
    post.author = author;
    post.body = body;
    post.excerpt = smartTrim(body, 100, " ", " ..."); // post excerpt 100 characters
    post.slug = slugify(about).toLowerCase();
    post.mabout = `${about} | ${process.env.APP_NAME}`;
    post.mdesc = stripHtml(body.substring(0, 160)); // post metadesc grab first 160 characters
    post.postedBy = req.user._id;
    // categories
    let arrayOfCategories = categories && categories.split(",");
    let arrayOfTags = tags && tags.split(",");

    if (files.photo) {
      if (files.photo.size > 10000000) {
        return res.status(400).json({
          error: "Image should be less then 1mb in size"
        });
      }
      post.photo.data = fs.readFileSync(files.photo.path);
      post.photo.contentType = files.photo.type;
    }

    post.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err)
        });
      }
      // res.json(result); add Categories on newly created post
      Post.findByIdAndUpdate(
        result._id,
        { $push: { categories: arrayOfCategories } },
        { new: true }
      ).exec((err, result) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err)
          });
        } else {
          Post.findByIdAndUpdate(
            result._id,
            { $push: { tags: arrayOfTags } },
            { new: true }
          ).exec((err, result) => {
            if (err) {
              return res.status(400).json({
                error: errorHandler(err)
              });
            } else {
              res.json(result);
            }
          });
        }
      });
    });
  });
};

// list, listAllPostsCategories, read, remove, update

exports.list = (req, res) => {
  Post.find({})
    .populate("categories", "_id name slug")
    .populate("tags", "_id name slug")
    .populate("postedBy", "_id name username")
    .select(
      "_id about author body slug excerpt categories tags postedBy createdAt updatedAt"
    )
    .exec((err, data) => {
      if (err) {
        return res.json({
          error: errorHandler(err)
        });
      }
      res.json(data);
    });
};

exports.listAllPostsCategoriesTags = (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 10;
  let skip = req.body.skip ? parseInt(req.body.skip) : 0;

  let posts;
  let categories;
  let tags;

  Post.find({})
    .populate("categories", "_id name slug")
    .populate("tags", "_id name slug")
    .populate("postedBy", "_id name username profile")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select(
      "_id about author source verification body slug excerpt categories tags postedBy createdAt updatedAt"
    )
    .exec((err, data) => {
      if (err) {
        return res.json({
          error: errorHandler(err)
        });
      }
      posts = data; // posts
      Category.find({}).exec((err, c) => {
        if (err) {
          return res.json({
            error: errorHandler(err)
          });
        }
        categories = c; // categories
        Tag.find({}).exec((err, t) => {
          if (err) {
            return res.json({
              error: errorHandler(err)
            });
          }
          tags = t;
          // return all posts categories
          res.json({ posts, categories, size: posts.length });
        });
      });
    });
};

exports.read = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Post.findOne({ slug })
    .populate("categories", "_id name slug")
    .populate("tags", "_id name slug")
    .populate("postedBy", "_id name username")
    .select(
      "_id about source verification author body slug mabout mdesc categories tags postedBy createdAt updatedAt"
    )
    .exec((err, data) => {
      if (err) {
        return res.json({
          error: errorHandler(err)
        });
      }
      res.json(data);
    });
};

exports.remove = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Post.findOneAndRemove({ slug }).exec((err, data) => {
    if (err) {
      return res.json({
        error: errorHandler(err)
      });
    }
    res.json({
      message: "Post deleted successfully"
    });
  });
};

exports.update = (req, res) => {
  const slug = req.params.slug.toLowerCase();

  Post.findOne({ slug }).exec((err, oldPost) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err)
      });
    }

    let form = new formidable.IncomingForm();
    form.keepExtensions = true;

    form.parse(req, (err, fields, files) => {
      if (err) {
        return res.status(400).json({
          error: "Image could not upload"
        });
      }

      let slugBeforeMerge = oldPost.slug;
      oldPost = _.merge(oldPost, fields); // nodejs method merge
      oldPost.slug = slugBeforeMerge; // old data = new data

      const { body, desc, categories, tags } = fields;

      if (body) {
        oldPost.excerpt = smartTrim(body, 320, " ", " ...");
        oldPost.desc = stripHtml(body.substring(0, 160));
      }

      if (categories) {
        oldPost.categories = categories.split(",");
      }

      if (tags) {
        oldPost.tags = tags.split(",");
      }

      if (files.photo) {
        if (files.photo.size > 10000000) {
          return res.status(400).json({
            error: "Image should be less then 1mb in size"
          });
        }
        oldPost.photo.data = fs.readFileSync(files.photo.path);
        oldPost.photo.contentType = files.photo.type;
      }

      oldPost.save((err, result) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err)
          });
        }
        // result.photo = undefined;
        res.json(result);
      });
    });
  });
};

exports.photo = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Post.findOne({ slug })
    .select("photo")
    .exec((err, post) => {
      if (err || !post) {
        return res.status(400).json({
          error: errorHandler(err)
        });
      }
      res.set("Content-Type", post.photo.contentType);
      return res.send(post.photo.data);
    });
};

exports.listRelated = (req, res) => {
  // console.log(req.body.post)
  let limit = req.body.limit ? parseInt(req.body.limit) : 3;
  const { _id, categories } = req.body.post;

  Post.find({ _id: { $ne: _id }, categories: { $in: categories } })
    .limit(limit)
    .populate("postedBy", "_id name username profile")
    .select("about author body slug excerpt postedBy createdAt updatedAt")
    .exec((err, posts) => {
      if (err) {
        return res.status(400).json({
          error: "Posts not found"
        });
      }
      res.json(posts);
    });
};

exports.listSearch = (req, res) => {
  const { search } = req.query; // input value at front-end
  if (search) {
    Post.find(
      {
        $or: [
          { about: { $regex: search, $options: "i" } },
          { body: { $regex: search, $options: "i" } }
        ]
      },
      (err, posts) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err)
          });
        }
        res.json(posts);
      }
    ).select("-photo -body");
  }
};

exports.listByUser = (req, res) => {
  User.findOne({ username: req.params.username }).exec((err, user) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err)
      });
    }
    let userId = user._id;
    Post.find({ postedBy: userId })
      .populate("categories", "_id name slug")
      .populate("tags", "_id name slug")
      .populate("postedBy", "_id name username")
      .select("_id about body author slug postedBy createdAt updatedAt")
      .exec((err, data) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err)
          });
        }
        res.json(data);
      });
  });
};
