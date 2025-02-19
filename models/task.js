const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tasksSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    deadline: {
      type: String,
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assign_to: {
      type: String,
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

const Task = mongoose.model("Task", tasksSchema);

module.exports = Task;
