const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const userController = require("../controllers/users");

router.get("/users", wrapAsync(userController.getUsers));

router.post("/signup", wrapAsync(userController.signup));

router.post("/login", wrapAsync(userController.login));

router.get("/logout", wrapAsync(userController.logout));

router.get("/isauthuser", wrapAsync(userController.getCurrUser));

module.exports = router;
