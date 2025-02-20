const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const projectController = require("../controllers/projects");

router
  .route("/")
  .get(wrapAsync(projectController.getProjects))
  .post(wrapAsync(projectController.createProject));

router.post("/delete", wrapAsync(projectController.deleteProject));

module.exports = router;
