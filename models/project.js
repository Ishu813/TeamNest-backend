const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Task = require("./task.js");

const projectsSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    deadline: {
      type: String,
      required: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    isDone: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

projectsSchema.post("findOneAndDelete", async (project) => {
  if (project) {
    let tasks = await Task.find({ project: project._id });
    let taskIds = tasks.map((task) => task._id);
    await Task.deleteMany({ _id: { $in: taskIds } });
  }
});

const Project = mongoose.model("Project", projectsSchema);

module.exports = Project;
