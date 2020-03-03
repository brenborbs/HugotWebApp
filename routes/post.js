const express = require("express");
const router = express.Router();
const {
  create,
  list,
  listAllPostsCategoriesTags,
  read,
  remove,
  update,
  photo,
  listRelated,
  listSearch,
  listByUser
} = require("../controllers/post");

const {
  requireSignin,
  adminMiddleware,
  authMiddleware,
  canUpdateDeletePost
} = require("../controllers/auth");

router.post("/post", requireSignin, adminMiddleware, create);
router.get("/posts", list);
router.post("/posts-categories-tags", listAllPostsCategoriesTags);
router.get("/post/:slug", read);
router.delete("/post/:slug", requireSignin, adminMiddleware, remove);
router.put("/post/:slug", requireSignin, adminMiddleware, update);
router.get("/post/photo/:slug", photo);
router.post("/posts/related", listRelated);
router.get("/posts/search", listSearch);

// auth user post crud
router.post("/user/post", requireSignin, authMiddleware, create);
router.get("/:username/posts", listByUser);
router.delete(
  "/user/post/:slug",
  requireSignin,
  authMiddleware,
  canUpdateDeletePost,
  remove
);
router.put(
  "/user/post/:slug",
  requireSignin,
  authMiddleware,
  canUpdateDeletePost,
  update
);

module.exports = router;
