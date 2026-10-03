export const notFound = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

export const errorHandler = (
  error,
  req,
  res,
  next
) => {
  const statusCode =
    res.statusCode >= 400
      ? res.statusCode
      : 500;

  console.error(error);

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Internal server error"
        : error.message,
    ...(process.env.NODE_ENV ===
      "development" && {
      stack: error.stack
    })
  });
};