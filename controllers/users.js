const User = require("../models/user");
const passport = require("passport");

module.exports.getUsers = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const users = await User.find({ username: { $ne: req.user.username } });

    users.sort((a, b) =>
      a.username.toLowerCase().localeCompare(b.username.toLowerCase())
    );

    res.status(200).json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports.signup = async (req, res) => {
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

      req.session.save(() => {
        res.status(201).json({
          message: "Signup and Login successful!",
          user: req.user,
        });
      });
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error during signup!",
      error: error.message,
    });
  }
};

module.exports.login = async (req, res, next) => {
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

        req.session.save((err) => {
          res.status(200).json({
            message: "Login successful!",
            user: {
              _id: user._id,
              name: user.name,
              username: user.username,
            },
          });
        });
      });
    })(req, res, next);
  } catch (error) {
    res.status(500).json({ message: "Server error!", error: error.message });
  }
};

module.exports.logout = async (req, res) => {
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
};

module.exports.getCurrUser = async (req, res) => {
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
};
