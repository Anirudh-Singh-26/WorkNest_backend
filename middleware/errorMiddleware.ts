import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(error);

   if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

   if (error.name === "ValidationError") {
    const errors: Record<string, string> = {};

    for (const field in error.errors) {
      errors[field] = error.errors[field].message;
    }

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

   if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A record with this value already exists",
    });
  }

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Internal server error"
        : error.message || "Something went wrong",
  });
};
