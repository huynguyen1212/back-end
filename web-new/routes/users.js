const express = require("express");
const router = express.Router();
const post = require("../model/post");
const user = require("../model/user");
const bcryptjs = require("bcryptjs");
const passport = require("passport");
require("../config/passportLocal")(passport);
require("../config/googleAuth")(passport);
require("../config/facebookAuth")(passport);

function checkAuth(req, res, next) {
  if (req.isAuthenticated()) {
    res.set(
      "Cache-Control",
      "no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0"
    );
    next();
  } else {
    req.flash("error_messages", "Please Login to continue !");
    res.redirect("/login");
  }
}

router.get("/", async (req, res) => {
  //find all
  const posts = await post.find({});
  const users = await user.find({});

  if (req.isAuthenticated()) {
    res.render("index", {
      posts: posts,
      user: req?.user?.role,
      logged: true,
      users: users,
      csrfToken: req.csrfToken(),
    });
  } else {
    res.render("index", {
      posts: posts,
      user: req?.user?.role,
      logged: false,
      users: users,
      csrfToken: req.csrfToken(),
    });
  }
});

router.post("/delete/:id", (req, res) => {
  const id = req.params.id.split("=")[1];

  if (req.user.role === "admin") {
    user.findByIdAndDelete(id, function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        res.status(200);
        res.redirect("/");
      }
    });
  } else {
    res.status(500);
    res.send("Something wrong");
  }
});

router.get("/login", (req, res) => {
  res.render("login", { csrfToken: req.csrfToken() });
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", {
    failureRedirect: "/login",
    successRedirect: "/profile",
    failureFlash: true,
  })(req, res, next);
});

router.get("/signup", (req, res) => {
  res.render("signup", { csrfToken: req.csrfToken() });
});

router.post("/signup", (req, res) => {
  // get all the values
  const { email, username, password, confirmpassword } = req.body;
  // check if the are empty
  if (!email || !username || !password || !confirmpassword) {
    res.render("signup", {
      err: "All Fields Required !",
      csrfToken: req.csrfToken(),
    });
  } else if (password != confirmpassword) {
    res.render("signup", {
      err: "Password Don't Match !",
      csrfToken: req.csrfToken(),
    });
  } else {
    // validate email and username and password
    // skipping validation
    // check if a user exists
    user.findOne(
      { $or: [{ email: email }, { username: username }] },
      function (err, data) {
        if (err) throw err;
        if (data) {
          res.render("signup", {
            err: "User Exists, Try Logging In !",
            csrfToken: req.csrfToken(),
          });
        } else {
          // generate a salt
          bcryptjs.genSalt(12, (err, salt) => {
            if (err) throw err;
            // hash the password
            bcryptjs.hash(password, salt, (err, hash) => {
              if (err) throw err;
              // save user in db
              user({
                username: username,
                email: email,
                password: hash,
                googleId: null,
                provider: "email",
                role: "user",
              }).save((err, data) => {
                if (err) throw err;
                // login the user
                // use req.login
                // redirect , if you don't want to login
                res.redirect("/login");
              });
            });
          });
        }
      }
    );
  }
});

router.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

//login gg, fb
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/profile");
  }
);

router.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: "email" })
);

router.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    // successRedirect: "/",
    failureRedirect: "/login",
  }),
  (req, res) => {
    res.redirect("/profile");
  }
);

router.get("/profile", checkAuth, (req, res) => {
  // adding a new parameter for checking verification
  res.render("profile", {
    username: req.user.username,
    verified: req.user.isVerified,
  });
});

module.exports = router;
