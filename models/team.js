const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const teamsSchema = new Schema({
  teamName: {
    type: String,
    required: true,
    trim: true,
  },
  members: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      isAdmin: {
        type: Boolean,
        default: false,
      },
    },
  ],
});

const Team = mongoose.model("Team", teamsSchema);
module.exports = Team;
