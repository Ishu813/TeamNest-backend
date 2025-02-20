const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const teamController = require("../controllers/teams");

router
  .route("/")
  .get(wrapAsync(teamController.getTeams))
  .post(wrapAsync(teamController.createTeam));

module.exports = router;
