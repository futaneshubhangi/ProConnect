import User from "../models/users.model.js";
import Profile from "../models/profile.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import fs from "fs";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import mongoose from "mongoose";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);





export const convertUserDataToPDF = async (userData) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });

      const outputPath =
        crypto.randomBytes(16).toString("hex") + ".pdf";

      const uploadDir = path.join(__dirname, "../uploads");

      // ✅ Ensure folder exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, outputPath);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // ===== Helper Function =====
      const addSectionTitle = (title) => {
        doc.moveDown();
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("black")
          .text(title);
        doc.moveDown(0.5);
      };

      // ===== Profile Image (UPDATED) =====
      try {
        if (userData?.userId?.profilePicture) {
          const imageUrl = userData.userId.profilePicture;

          // ✅ If Cloudinary URL
          if (imageUrl.startsWith("http")) {
            const response = await axios.get(imageUrl, {
              responseType: "arraybuffer"
            });

            const imageBuffer = Buffer.from(response.data, "binary");

            doc.image(imageBuffer, 470, 45, {
              fit: [80, 60],
              align: "right"
            });

          } else {
            // ✅ Local image
            const imagePath = path.join(
              __dirname,
              "../uploads",
              imageUrl
            );

            if (fs.existsSync(imagePath)) {
              doc.image(imagePath, 450, 50, { width: 80 });
            }
          }
        }
      } catch (err) {
        console.log("Image load failed:", err.message);
      }

      // ===== Header =====
      doc
        .fontSize(26)
        .font("Helvetica-Bold")
        .text(userData?.userId?.name || "No Name", 50, 50);

      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("gray")
        .text(
          `${userData?.userId?.email || ""} | ${
            userData?.userId?.username || ""
          }`,
          50,
          80
        );

      doc.moveDown();

      // ===== Divider =====
      doc
        .strokeColor("#aaaaaa")
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke();

      doc.moveDown();

      // ===== Summary =====
      addSectionTitle("Professional Summary");
      doc.text(userData?.bio || "No summary provided");

      // ===== Current Position =====
      addSectionTitle("Current Position");
      doc.text(userData?.currentPost || "Not specified");

      // ===== Skills =====
      addSectionTitle("Skills");
      doc.text(
        userData?.skills?.length
          ? userData.skills.join(", ")
          : "Not specified"
      );

      // ===== Work Experience =====
      addSectionTitle("Work Experience");

      (userData?.pastWork || []).forEach((work) => {
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .text(
            `${work?.position || "Role"} - ${
              work?.company || "Company"
            }`
          );

        doc
          .fontSize(10)
          .fillColor("gray")
          .text(`Year: ${work?.years || "N/A"}`);

        doc.moveDown(0.5);
      });

      doc.fillColor("black");

      // ===== Education =====
      addSectionTitle("Education");

      (userData?.education || []).forEach((edu) => {
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .text(
            `${edu?.degree || "Degree"} - ${
              edu?.fieldOfStudy || "Field"
            }`
          );

        doc
          .fontSize(10)
          .fillColor("gray")
          .text(edu?.school || "School");

        doc.moveDown(0.5);
      });

      // ===== Finish =====
      doc.end();

      stream.on("finish", () => {
        resolve(outputPath);
      });

      stream.on("error", (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
};





export const register = async (req, res) => {
  try {

    const { name, email, password, username } = req.body;

    if (!name || !email || !password || !username) {
      return res.send("All fields are required");
    }

    const user = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (user) {
      return res.send("Email or username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      username,
      password: hashedPassword
    });

    const profile = new Profile({
      userId: newUser._id
    });

    await profile.save();

    // ✅ IMPORTANT CHANGE
    res.redirect("/login");

  } catch (error) {
    res.send(error.message);
  }
};



export const login = async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.send("Email and password required");
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.send("User not found");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.send("Invalid password");
    }

    // ✅ SAVE USER IN SESSION
    req.session.userId = user._id;

    // ✅ REDIRECT
    res.redirect("/feed");

  } catch (error) {
    res.send(error.message);
  }
};

export const uploadProfilePicture = async (req, res) => {
  try {

    const userId = req.session.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.send("User not found");
    }

    // ✅ Cloudinary URL
    user.profilePicture = req.file.path;

    await user.save();

    res.redirect("/profile/" + userId);

  } catch (error) {
    res.send(error.message);
  }
};


export const updateUserProfile = async (req, res) => {
  try {

    const userId = req.session.userId;
    const { name, username, bio, currentPost } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.send("User not found");
    }

    // TEXT UPDATE
    if (name) user.name = name;
    if (username) user.username = username;

    // 🔥 FIXED CLOUDINARY IMAGE
    if (req.file) {
      user.profilePicture = req.file.path; // ✅ FIX
    }

    await user.save();

    const profile = await Profile.findOne({ userId });

    if (!profile) {
      return res.send("Profile not found");
    }

    if (bio) profile.bio = bio;
    if (currentPost) profile.currentPost = currentPost;

    await profile.save();

    res.redirect("/profile/" + userId);

  } catch (error) {
    res.send(error.message);
  }
};

export const getUserAndProfile = async (req, res) => {
  try {

    const userId = req.session.userId;

    const user = await User.findById(userId).select("-password -__v -token");

    const profile = await Profile.findOne({ userId }).select("-__v");

    return res.json({
      user,
      profile
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateProfileData = async (req, res) => {
  try {
    const userId = req.session.userId;

    const profile = await Profile.findOne({ userId });

    if (!profile) {
      return res.send("Profile not found");
    }

    const {
      bio,
      currentPost,
      skills,
      position,
      company,
      years,
      degree,
      fieldOfStudy,
      school
    } = req.body;

    if (bio) profile.bio = bio;
    if (currentPost) profile.currentPost = currentPost;

    // ✅ Skills
    if (skills) {
      profile.skills = skills.split(",").map(s => s.trim());
    }

    // ✅ Work Experience
    profile.pastWork = [
      {
        position,
        company,
        years
      }
    ];

    // ✅ Education
    profile.education = [
      {
        degree,
        fieldOfStudy,
        school
      }
    ];

    await profile.save();

    console.log(req.body); // DEBUG

    res.redirect("/profile/" + userId);

  } catch (error) {
    res.send(error.message);
  }
};



export const getAllUserProfiles = async (req, res) => {
  try {
    const userId = req.session.userId;

    const myProfile = await Profile.findOne({ userId });

    if (!myProfile) {
      return res.send("Profile not found");
    }

    // ✅ Connected Users
    const connectedUsers = await Profile.find({
      userId: { $in: myProfile.connections }
    })
      .populate("userId", "name username email profilePicture")
      .select("-__v");

    // ✅ Incoming Requests (🔥 NEW)
    const requests = await Profile.find({
      userId: { $in: myProfile.connectionRequests }
    })
      .populate("userId", "name username email profilePicture")
      .select("-__v");

    // ✅ All Other Users
    const allUsers = await Profile.find({
      userId: { $ne: new mongoose.Types.ObjectId(userId) }
    })
      .populate("userId", "name username email profilePicture")
      .select("-__v");

    // ✅ Add isPending & isConnected
    const otherUsers = allUsers.map(user => {

      const isConnected = myProfile.connections.some(
        id => id.toString() === user.userId._id.toString()
      );

      // 🔥 FIXED Pending Logic (both directions)
      const isPending =
        user.connectionRequests?.some(
          id => id.toString() === userId.toString()
        ) || // I sent request
        myProfile.connectionRequests?.some(
          id => id.toString() === user.userId._id.toString()
        ); // They sent request

      return {
        ...user._doc,
        userId: user.userId,
        isConnected,
        isPending
      };
    });

    // ✅ Render all data
    res.render("network", {
      connectedUsers,
      otherUsers,
      requests   // 🔥 IMPORTANT for Accept/Reject UI
    });

  } catch (error) {
    res.status(500).send(error.message);
  }
};


export const downloadProfile = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        message: "User not logged in"
      });
    }

    const userProfile = await Profile.findOne({ userId: userId })
      .populate("userId", "name username email profilePicture");

      console.log("USER PROFILE DATA:", userProfile);

    if (!userProfile) {
      return res.status(404).json({
        message: "Profile not found"
      });
    }

    const pdfPath = await convertUserDataToPDF(userProfile);

    const fullPath = path.join(__dirname, "../uploads", pdfPath);

    res.download(fullPath);

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.message
    });
  }
};




export const sendConnectionRequest = async (req, res) => {
  try {
    const senderId = req.session.userId;
    const { connectionId } = req.body;

    if (!connectionId) {
      return res.redirect("/user/network");
    }

    if (senderId.toString() === connectionId.toString()) {
      return res.redirect("/user/network");
    }

    const receiverProfile = await Profile.findOne({ userId: connectionId });

    if (!receiverProfile) {
      return res.redirect("/user/network");
    }

    const alreadyConnected = receiverProfile.connections?.some(
      id => id.toString() === senderId.toString()
    );

    const alreadyRequested = receiverProfile.connectionRequests?.some(
      id => id.toString() === senderId.toString()
    );

    if (!alreadyConnected && !alreadyRequested) {
      receiverProfile.connectionRequests.push(senderId);
      await receiverProfile.save();
    }

    res.redirect("/user/network");

  } catch (error) {
    res.redirect("/user/network");
  }
};


export const acceptConnectionRequest = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { senderId } = req.body;

    if (!senderId) {
      return res.redirect("/user/network");
    }

    const userProfile = await Profile.findOne({ userId });
    const senderProfile = await Profile.findOne({ userId: senderId });

    if (!userProfile || !senderProfile) {
      return res.redirect("/user/network");
    }

    const requestExists = userProfile.connectionRequests.some(
      id => id.toString() === senderId.toString()
    );

    if (!requestExists) {
      return res.redirect("/user/network");
    }

    if (!userProfile.connections.some(id => id.toString() === senderId.toString())) {
      userProfile.connections.push(senderId);
    }

    if (!senderProfile.connections.some(id => id.toString() === userId.toString())) {
      senderProfile.connections.push(userId);
    }

    userProfile.connectionRequests = userProfile.connectionRequests.filter(
      id => id.toString() !== senderId.toString()
    );

    await userProfile.save();
    await senderProfile.save();

    res.redirect("/user/network");

  } catch (error) {
    res.redirect("/user/network");
  }
};


export const rejectConnectionRequest = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { senderId } = req.body;

    if (!senderId) {
      return res.redirect("/user/network");
    }

    const profile = await Profile.findOne({ userId });

    if (!profile) {
      return res.redirect("/user/network");
    }

    const requestExists = profile.connectionRequests.some(
      id => id.toString() === senderId.toString()
    );

    if (requestExists) {
      profile.connectionRequests = profile.connectionRequests.filter(
        id => id.toString() !== senderId.toString()
      );

      await profile.save();
    }

    res.redirect("/user/network");

  } catch (error) {
    res.redirect("/user/network");
  }
};


export const getConnectionRequests = async (req, res) => {
  try {
    const userId = req.session.userId;

    const profile = await Profile.findOne({ userId }).populate(
      "connectionRequests",
      "name username email profilePicture"
    );

    // ✅ Check profile exists
    if (!profile) {
      return res.status(404).json({
        message: "Profile not found"
      });
    }

    res.json({
      requests: profile.connectionRequests || []
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

export const getConnections = async (req, res) => {
  try {
    const userId = req.session.userId;

    const profile = await Profile.findOne({ userId }).populate(
      "connections",
      "name username email profilePicture"
    );

    // ✅ Check profile exists
    if (!profile) {
      return res.status(404).json({
        message: "Profile not found"
      });
    }

    res.json({
      connections: profile.connections || []
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};