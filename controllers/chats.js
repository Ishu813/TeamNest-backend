const Chat = require("../models/chat");

module.exports.getChats = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const chats = await Chat.find({})
      .populate("sender", "name username email")
      .populate("receiver", "name username email");

    res.status(200).json(chats);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports.sendChat = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { receiver, message, teamId } = req.body;
  if ((!receiver && !teamId) || !message) {
    return res
      .status(400)
      .json({ message: "Receiver and message are required" });
  }

  try {
    const chat = new Chat({
      sender: req.user._id,
      receiver,
      message,
      teamId,
    });

    await chat.save();

    res.status(201).json(chat);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
