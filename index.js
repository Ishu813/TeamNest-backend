if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const methodOverride = require("method-override");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const http = require("http");
const { Server } = require("socket.io");

const User = require("./models/user.js");
const Chat = require("./models/chat.js");
const ExpressError = require("./utils/ExpressError.js");

const chatRouter = require("./routes/chat.js");
const projectRouter = require("./routes/project.js");
const taskRouter = require("./routes/task.js");
const teamRouter = require("./routes/team.js");
const userRouter = require("./routes/user.js");

const MONGO_URL = process.env.MONGO_URL;
const ORIGIN = process.env.ORIGIN_PORT;
const PORT = process.env.PORT || 5000;

mongoose
  .connect(MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const corsOptions = {
  origin: ORIGIN,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const store = MongoStore.create({
  mongoUrl: MONGO_URL,
  crypto: { secret: process.env.SECRET },
  touchAfter: 24 * 3600,
});

store.on("error", (err) => {
  console.error("MongoStore session error:", err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  },
};

app.set("trust proxy", 1);
app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.get("/", (req, res) => res.send("Hi! I am root"));

app.use("/chats", chatRouter);
app.use("/projects", projectRouter);
app.use("/tasks", taskRouter);
app.use("/teams", teamRouter);
app.use("/", userRouter);

// ========== SOCKET.IO ==========
let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", async (username) => {
    onlineUsers[username] = socket.id;

    const user = await User.findOne({ username });
    if (user) {
      user.status = "online";
      await user.save();
    }

    console.log(`${username} joined`);
  });

  socket.on("private_message", async ({ sender, receiver, message }) => {
    const newMessage = new Chat({ sender, receiver, message });
    await newMessage.save();

    const receiverSocketId = onlineUsers[receiver];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive_private_message", {
        sender,
        message,
      });
    }
  });

  socket.on("join-team", (teamId) => {
    socket.join(teamId);
    console.log(`User ${socket.id} joined team ${teamId}`);
  });

  socket.on("group_message", async ({ teamId, sender, message }) => {
    const newMessage = new Chat({ sender, teamId, message });
    await newMessage.save();

    io.to(teamId).emit("group-message", { sender, message, teamId });
  });

  socket.on("disconnect", async () => {
    const username = Object.keys(onlineUsers).find(
      (key) => onlineUsers[key] === socket.id
    );
    if (username) {
      delete onlineUsers[username];

      const user = await User.findOne({ username });
      if (user) {
        user.status = "offline";
        await user.save();
      }

      console.log(`${username} disconnected`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
