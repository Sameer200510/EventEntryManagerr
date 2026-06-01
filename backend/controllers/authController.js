const prisma = require("../prismaClient");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("FATAL ERROR: JWT_SECRET is not defined in production environment.");
}
const JWT_SECRET = process.env.JWT_SECRET || "development_secret_only";

const signToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};

exports.register = async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
      }
      if (!token) return res.status(401).json({ error: "Not authorized. Setup is complete, an admin token is required." });
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'ADMIN') return res.status(403).json({ error: "Forbidden: Only administrators can create new users." });
      } catch (err) {
        return res.status(401).json({ error: "Not authorized. Invalid token." });
      }
    }

    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({
        error: "username, password and role are required",
      });
    }

    const validRoles = ["ADMIN", "ENTRY_VOLUNTEER", "FOOD_VOLUNTEER"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: "Invalid role",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: { name: username },
    });

    if (existingUser) {
      return res.status(400).json({
        error: "Username already in use",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: username,
        passwordHash: hashedPassword,
        role,
      },
    });

    const token = signToken(user.id, user.role);

    return res.status(201).json({
      token,
      role: user.role,
      username: user.name,
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err.message);
    return res.status(500).json({
      error: err.message || "Server error",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Please provide username and password",
      });
    }

    const user = await prisma.user.findFirst({
      where: { name: username },
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    if (user.active === false) {
      return res.status(401).json({
        error: "User is inactive",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const token = signToken(user.id, user.role);

    return res.status(200).json({
      token,
      role: user.role,
      username: user.name,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err.message);
    return res.status(500).json({
      error: err.message || "Server error",
    });
  }
};
