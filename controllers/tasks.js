const Task = require("../models/task");
const Project = require("../models/project");

module.exports.getTasks = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { projectId } = req.query;

    let query = {};
    if (projectId) {
      query.project = projectId;
    }

    const tasks = await Task.find(query).populate({
      path: "project",
      populate: {
        path: "team",
        populate: {
          path: "members.user",
        },
      },
    });

    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.createTask = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { content, project, assign_to, deadline } = req.body;

    if (!content || !project || !assign_to) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const projectData = await Project.findById(project).populate("team");
    if (!projectData) {
      return res.status(404).json({ message: "Project not found." });
    }

    const isTeamMember = projectData.team.members.some((member) =>
      member.user.equals(req.user._id)
    );

    if (!isTeamMember) {
      return res
        .status(403)
        .json({ message: "You are not part of this project." });
    }

    const task = new Task({
      content,
      project,
      assign_to,
      deadline,
      createdBy: req.user._id,
    });

    await task.save();
    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.setTaskDone = async (req, res) => {
  try {
    const { taskId, isDone } = req.body;

    if (!taskId || typeof isDone !== "boolean") {
      return res.status(400).json({ message: "Invalid input data" });
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.assign_to !== req.user.username) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this task" });
    }

    task.isDone = isDone;
    await task.save();

    res.status(200).json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Task ID is required" });
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.assign_to !== req.user.username && !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this task" });
    }

    await Task.findByIdAndDelete(task._id);

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
