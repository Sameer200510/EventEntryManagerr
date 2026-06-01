const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("FATAL ERROR: JWT_SECRET is not defined in production environment.");
}

const JWT_SECRET = process.env.JWT_SECRET || "development_secret_only";

exports.protect = (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ error: "Not authorized to access this route" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Strict legacy role rejection
    const validRoles = ["ADMIN", "ENTRY_VOLUNTEER", "FOOD_VOLUNTEER"];
    if (!validRoles.includes(decoded.role)) {
      return res.status(401).json({
        error: "Invalid or legacy role in token. Please re-authenticate.",
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ error: "Not authorized to access this route" });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "User role is not authorized to access this route" });
    }
    next();
  };
};
