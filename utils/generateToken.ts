import jwt from "jsonwebtoken";

export const generateAccessToken = (userId: string, tokenVersion: number) => {
  return jwt.sign(
    {
      userId,
      tokenVersion,
    },
    process.env.JWT_ACCESS_SECRET!,
    {
      expiresIn: "15m",
    },
  );
};

export const generateRefreshToken = (userId: string, tokenVersion: number) => {
  return jwt.sign(
    {
      userId,
      tokenVersion,
    },
    process.env.JWT_REFRESH_SECRET!,
    {
      expiresIn: "7d",
    },
  );
};
