if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const User = require("./models/user.js");
const cors = require("cors");
const methodOverride = require("method-override");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const ExpressError = require("./utils/ExpressError.js");

const chatRouter = require("./routes/chat.js");
const projectRouter = require("./routes/project.js");
const taskRouter = require("./routes/task.js");
const teamRouter = require("./routes/team.js");
const userRouter = require("./routes/user.js");

const Chat = require("./models/chat.js");

const http = require("http");
const { Server } = require("socket.io");

const MONGO_URL = process.env.MONGO_URL;

main()
  .then(() => {
    console.log("connected to database");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

const corsOptions = {
  origin: process.env.ORIGIN_PORT, // React app's URL
  credentials: true, // Allow cookies and credentials
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // set to frontend URL in production
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const store = MongoStore.create({
  mongoUrl: MONGO_URL,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});

store.on("error", (err) => {
  console.log("ERROR in MONGO SESSION", err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxage: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  },
};

app.set("trust proxy", 1);

app.use(session(sessionOptions));

app.use(passport.initialize());
app.use(passport.session());
passport.use(User.createStrategy());

passport.serializeUser((user, done) => {
  done(null, user.id); // Only store user ID in session
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user); // Attach user object to req.user
  } catch (err) {
    done(err, null);
  }
});

app.get("/", (req, res) => {
  res.send("Hi! I am root");
});

app.use("/chats", chatRouter);
app.use("/projects", projectRouter);
app.use("/tasks", taskRouter);
app.use("/teams", teamRouter);
app.use("/", userRouter);

let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  socket.on("join", async (username) => {
    onlineUsers[username] = socket.id;
    const user = await User.findOne({ username: username });
    if (user) {
      user.status = "online";
      await user.save();
    }
    console.log(`${username} joined`);
  });

  socket.on("private_message", async ({ receiver, sender, message }) => {
    const newMessage = new Chat({
      sender: sender,
      receiver: receiver,
      message: message,
    });
    await newMessage.save();
    const receiverSocket = onlineUsers[receiver];
    const senderSocket = onlineUsers[sender];

    // Emit to receiver
    if (receiverSocket) {
      io.to(receiverSocket).emit("private_message", {
        sender: sender,
        message: message,
      });
    }

    // Emit back to sender
    if (senderSocket) {
      io.to(senderSocket).emit("private_message", {
        sender: sender,
        message: message,
      });
    }
  });

  socket.on("join-team", (teamId) => {
    socket.join(teamId);
    console.log(`User ${socket.id} joined team ${teamId}`);
  });

  socket.on("group_message", async ({ teamId, sender, message }) => {
    const newMessage = new Chat({
      sender,
      message,
      teamId, // save teamId instead of receiver
    });
    await newMessage.save();

    // Send message to all in the team room
    io.to(teamId).emit("group-message", { sender, message, teamId });
    console.log(`Group message in team ${teamId} from ${sender}: ${message}`);
  });

  socket.on("disconnect", async () => {
    const username = Object.keys(onlineUsers).find(
      (key) => onlineUsers[key] === socket.id
    );

    if (username) {
      delete onlineUsers[username];

      try {
        const user = await User.findOne({ username });
        if (user) {
          user.status = "offline";
          await user.save();
        }

        console.log(`${username} is offline`);
      } catch (err) {
        console.error("Error setting user offline:", err);
      }
    }
  });
});

const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log(`server is listening on port ${PORT}`);
});
