const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const chatController = require("../controllers/chats");

router
  .route("/")
  .get(wrapAsync(chatController.getChats))
  .post(wrapAsync(chatController.sendChat));

module.exports = router;
