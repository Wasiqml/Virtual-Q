require("dotenv").config();

const bcrypt = require("bcryptjs");
const connectDatabase = require("./config/db");
const Admin = require("./models/Admin");

const seedAdmin = async () => {
  try {
    await connectDatabase();

    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const existingAdmin = await Admin.findOne({ username });

    if (existingAdmin) {
      console.log("Admin already exists.");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await Admin.create({
      username,
      password: hashedPassword
    });

    console.log(`Admin created with username: ${username}`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed admin:", error.message);
    process.exit(1);
  }
};

seedAdmin();
