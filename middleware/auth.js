import { verifyToken } from "../utils/auth.js";

export const authMiddleware = async (req) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  let isAuth = false;
  let user = null;

  if (token) {
    try {
      const decoded = verifyToken(token);
      user = decoded;
      isAuth = true;
    } catch (error) {
      isAuth = false;
      user = null;
    }
  }

  return { isAuth, user };
};
