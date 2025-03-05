import jwt from 'jsonwebtoken';
import { errorHandler } from './error.js';

export const verifyToken = (req, res, next) => {
  console.log("verify");
    const token = req.cookies.access_token;
  
    if (!token) return next(errorHandler(401, 'You are not authenticated!'));
  
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => { 
        console.log(">>",decodedToken);
      if (err) return next(errorHandler(403, 'Token is not valid!'));
  
      req.user = { id: decodedToken.id }; // Attach user ID to req.user
      next();
    });
  };