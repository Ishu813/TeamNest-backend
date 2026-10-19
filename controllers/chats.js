const { GoogleGenAI } = require("@google/genai");
const Chat = require("../models/chat");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

module.exports.getChats = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const chats = await Chat.find({});

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
      sender: req.user.username,
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

module.exports.getAIResponse = async (req, res) => {
  try {
    const { message } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error("OpenAI API error:", error.message);
    res.status(500).json({ error: "Failed to generate a response." });
  }
};
