import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dns from "dns";
import path from "path";
import { fileURLToPath } from "url";
import expressLayouts from "express-ejs-layouts";
import session from "express-session";
import methodOverride from "method-override";

// MODELS
import User from "./models/users.model.js";
import Profile from "./models/profile.model.js";
import Post from "./models/posts.model.js";
import Comment from "./models/comments.model.js";

// ROUTES
import userRoutes from "./routes/user.routes.js";
import postRoutes from "./routes/posts.routes.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();

// __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.use(expressLayouts);
app.set("layout", "layouts/boilerplate");

app.use(session({
  secret: process.env.JWT_SECRET || "fallbacksecret",
  resave: false,
  saveUninitialized: true
}));

// Make userId available in all EJS
app.use((req, res, next) => {
  res.locals.userId = req.session.userId;
  next();
});

// STATIC FILES
app.use(express.static(path.join(__dirname, "public")));

// VIEW ENGINE
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ROUTES
app.use("/user", userRoutes);
app.use("/post", postRoutes);

// AUTH PAGES
app.get("/login", (req, res) => {
  res.render("auth/login");
});

app.get("/register", (req, res) => {
  res.render("auth/register");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// =======================
// ✅ FEED PAGE
// =======================
app.get("/feed", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("userId", "username profilePicture")
      .sort({ createdAt: -1 });

    const comments = await Comment.find()
      .populate("userId", "username profilePicture");

    let user = null;
    let profile = null;

    if (req.session.userId) {
      user = await User.findById(req.session.userId);
      profile = await Profile.findOne({ userId: req.session.userId });
    }

    res.render("posts/index", {
      posts,
      comments,
      user,
      profile,
      userId: req.session.userId
    });

  } catch (err) {
  console.log("FEED ERROR:", err);
  res.status(500).send(err.message); // 👈 show exact error
}
});

// =======================
// ✅ PROFILE PAGE
// =======================
app.get("/profile/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const profile = await Profile.findOne({ userId: req.params.id });

    const posts = await Post.find({ userId: req.params.id })
      .sort({ createdAt: -1 });

    res.render("profile", {
      user,
      profile,
      posts,
      userId: req.session.userId
    });

  } catch (err) {
    console.log("PROFILE ERROR:", err);
    res.status(500).send("Error loading profile");
  }
});

// =======================
// ✅ EDIT PROFILE
// =======================
app.get("/edit-profile", async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    const profile = await Profile.findOne({
      userId: req.session.userId
    });

    res.render("editProfile", {
      user,
      profile
    });

  } catch (err) {
    console.log("EDIT PROFILE ERROR:", err);
    res.status(500).send("Error loading edit profile");
  }
});

// =======================
// ✅ ROOT ROUTE (FIXED)
// =======================


// =======================
// ✅ SERVER START (FIXED)
// =======================
const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected ✅");

    const PORT = process.env.PORT || 8080;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} 🚀`);
    });

  } catch (error) {
    console.log("MongoDB Connection Failed ❌");
    console.log(error);
  }
};

start();