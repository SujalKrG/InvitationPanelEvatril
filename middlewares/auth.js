import db from "../models/index.js";
import axios from "axios";

const { User } = db;

export const authenticateUser = async (req, res, next) => {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.headers["x-access-token"]) {
      token = req.headers["x-access-token"];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    let verifyRes;
    try {
      verifyRes = await axios.get(process.env.AUTH_VERIFY_URL, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      // console.log("[AUTH] auth service status:", verifyRes.status);
    } catch (error) {
      if (error.response?.status === 401) {
        console.error(
          "[AUTH] auth service error:",
          error?.response?.status || error.message
        );
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
      }
      console.error("Auth service error:", error.message || error);
      return res
        .status(502)
        .json({ message: "Error validating token with auth service" });
    }

    const data = verifyRes.data;
    const user = data?.user || data?.userDetails || data;
    if (!user || !user.id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Invalid token response" });
    }

    req.user = user; // Attach user to request object
    req.authToken = data?.token || token;
    // console.log("[AUTH] verified user id:", user?.id);
    next();
  } catch (error) {
    console.error("Error authenticating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
