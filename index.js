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

app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page not found!"));
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`server is listening on port ${PORT}`);
});
