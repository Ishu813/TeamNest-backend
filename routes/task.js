const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const taskController = require("../controllers/tasks");

router
  .route("/")
  .get(wrapAsync(taskController.getTasks))
  .post(wrapAsync(taskController.createTask))
  .patch(wrapAsync(taskController.setTaskDone));

router.post("/delete", wrapAsync(taskController.deleteTask));

module.exports = router;
