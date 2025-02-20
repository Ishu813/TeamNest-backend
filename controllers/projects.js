const Project = require("../models/project");
const Team = require("../models/team");
const Task = require("../models/task");

module.exports.getProjects = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const projects = await Project.find({})
      .populate({
        path: "team",
        match: { "members.user": req.user._id },
        populate: {
          path: "members.user",
          select: "name username",
        },
      })
      .exec();

    const filteredProjects = projects.filter((project) => project.team);

    res.status(200).json(filteredProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.createProject = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { title, description, deadline, team } = req.body;

    if (!title || !description || !deadline || !team) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    const existingProject = await Project.findOne({ title });
    if (existingProject) {
      return res.status(409).json({ message: "Project title already exists!" });
    }

    const existingTeam = await Team.findById(team);
    if (!existingTeam) {
      return res.status(404).json({ message: "Team not found!" });
    }

    const project = new Project({ title, description, deadline, team });
    await project.save();

    res.status(201).json({ message: "Project created successfully!", project });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.deleteProject = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Project ID is required!" });
    }

    const project = await Project.findById(id).populate("team");
    if (!project) {
      return res.status(404).json({ message: "Project not found!" });
    }

    const isAdmin = project.team.members.some(
      (member) =>
        member.user.toString() === req.user._id.toString() && member.isAdmin
    );

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Forbidden: Only admins can delete this project!" });
    }

    await Task.deleteMany({ project: id });

    await Project.findByIdAndDelete(id);

    res
      .status(200)
      .json({ message: "Project and related tasks deleted successfully!" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
