const express = require("express");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.status(401).json({ message: "Invalid login details." });
    }

    const passwordMatches = await bcrypt.compare(password, admin.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid login details." });
    }

    res.json({
      message: "Login successful",
      admin: {
        id: admin._id,
        username: admin.username
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to login right now." });
  }
});

module.exports = router;
