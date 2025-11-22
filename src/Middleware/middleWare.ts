import express, { Response, NextFunction } from "express";
import { auth } from "../admin/admin";
interface IUserRequest extends express.Request {
  user?: any;
}

// Checks wether user is logged in and valid for making request
export const middleWare = async (
  req: IUserRequest,
  res: Response,
  next: NextFunction
) => {
  const { authorization } = req.headers;
  try {
    const token = authorization?.split("Bearer ")[1];
    if (!token) {
      return res.status(400).json({ message: "Invalid Token" });
    }
    const decodedToken = await auth.verifyIdToken(token);
    // attaches decodedToken on req
    req.user = decodedToken;
    return next();
  } catch {
    return res.status(401).json({ message: "You are not authorized" });
  }
};

export const adminMiddleWare = async (
  req: IUserRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    const userRec = await auth.getUser(user.uid);

    //checks user role if admin
    if (userRec.customClaims?.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }
    return next();
  } catch (error) {
    console.error("❌ Admin middleware error:", error);
    return res.status(403).json({ message: "You are not an admin" });
  }
};
