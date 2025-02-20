const Team = require("../models/team");

module.exports.getTeams = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const teams = await Team.find({}).populate("members.user", "name username");

    const userTeams = teams.filter((team) =>
      team.members.some((member) => member.user.username === req.user.username)
    );

    res.status(200).json(userTeams);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports.createTeam = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { teamName, members } = req.body;
    if (!teamName) {
      return res.status(400).json({ error: "Team name is required" });
    }

    const team = new Team({
      teamName,
      members: [...members, { user: req.user._id, isAdmin: true }],
    });

    await team.save();

    res.status(201).json(team); // 201 Created for successful team creation
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};
