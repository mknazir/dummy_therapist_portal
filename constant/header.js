const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];

const headers = (reqOrigin) => {
  let origin = allowedOrigins.includes(reqOrigin) ? reqOrigin : ""; // Check if request origin is allowed
  return {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Origin": origin, // Dynamically set the origin
    "Access-Control-Allow-Methods": "DELETE, GET, POST, OPTIONS, PUT, PATCH",
    "Content-Type":
      "image/png, image/jpeg, image/gif, image/svg+xml, application/pdf, video/mp4, video/quicktime, video/avi, audio/mpeg, audio/wav, application/json",
  };
};

module.exports = { headers };
