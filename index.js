require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Project = require("./models/project.js");
const Task = require("./models/task.js");
const User = require("./models/user.js");
const Chat = require("./models/chat.js");
const Team = require("./models/team.js");
const cors = require("cors");
const methodOverride = require("method-override");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const ExpressError = require("./utils/ExpressError.js");
const wrapAsync = require("./utils/wrapAsync.js");

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
    secure: false,
    sameSite: "lax",
  },
};

app.use(session(sessionOptions));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser((user, done) => {
  console.log(user.id);
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

app.use((req, res, next) => {
  console.log(req.session);
  next();
});

app.get("/", (req, res) => {
  res.send("Hi! I am root");
});

app.get("/users", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const users = await User.find({ username: { $ne: req.user.username } });

    res.status(200).json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

app.get("/chats", async (req, res) => {
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
});

app.post("/chats", async (req, res) => {
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
});

app.post(
  `/signup`,
  wrapAsync(async (req, res) => {
    const { name, username, password, confirmPassword } = req.body;

    if (!name || !username || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Confirm password does not match the Password!",
      });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({
        message: "Username already exists.",
      });
    }

    const newUser = new User({ name, username });

    try {
      const registeredUser = await User.register(newUser, password);
      req.login(registeredUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to log in!" });
        }
        console.log("A User registered with Username :", username);
        res.status(201).json({
          message: "Signup and Login successful!",
          user: req.user,
        });
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error during signup!",
        error: error.message,
      });
    }
  })
);

app.post("/login", async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required!" });
  }

  try {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error." });
      }
      if (!user) {
        return res
          .status(401)
          .json({ message: "Username or Password is incorrect!" });
      }

      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to log in." });
        }
        console.log("A User Logged In with Username :", username);
        res.status(200).json({
          message: "Login successful!",
          user: {
            _id: user._id,
            name: user.name,
            username: user.username,
          },
        });
      });
    })(req, res, next);
  } catch (error) {
    res.status(500).json({ message: "Server error!", error: error.message });
  }
});

app.get("/logout", (req, res, next) => {
  const user = req.user;
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to log out" });
      }

      res.clearCookie("connect.sid");
      console.log("A User logged out with Username :", user.username);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
});

app.get("/isauthuser", (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json({
      message: "Welcome to the home page",
      user: {
        _id: req.user._id,
        name: req.user.name,
        username: req.user.username,
      },
    });
  } else {
    res.status(200).json({ message: "Unauthorized" });
  }
});

app.get("/teams", async (req, res) => {
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
});

app.post("/teams", async (req, res) => {
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
});

app.get("/projects", async (req, res) => {
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
});

app.post("/projects", async (req, res) => {
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
});

app.post("/projects/delete", async (req, res) => {
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
});

app.get("/tasks", async (req, res) => {
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
});

app.post("/tasks", async (req, res) => {
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
});

app.patch("/tasks", async (req, res) => {
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
});

app.post("/tasks/delete", async (req, res) => {
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
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`server is listening on port ${PORT}`);
});
