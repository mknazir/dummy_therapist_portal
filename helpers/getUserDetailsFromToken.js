const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { getDb } = require("../db/db");

const getUserDetailsFromToken = async (token) => {
  if (!token) {
    return {
      message: "session out",
      logout: true,
      notvalid:true
    };
  }

  try {
    // Verify token and handle token expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const db = getDb();
    const user = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(decoded._id) },
        { projection: { password: 0 } }
      );

    return user;
  } catch (error) {
    // Handle the error when the token has expired
    if (error.name === "TokenExpiredError") {
      return {
        message: "Token has expired",
        expired: true,
        logout: true,
        notvalid:true
      };
    }

    // Handle other JWT-related errors
    return {
      message: "Invalid token",
      logout: true,
      notvalid:true
    };
  }
};

module.exports = getUserDetailsFromToken;

