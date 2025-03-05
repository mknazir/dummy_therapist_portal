const jwt = require('jsonwebtoken');
const  getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');
const path = require('path');

const authenticateToken = async (req, res, next) => {
   console.log("inside token auth");
    try {
        
        const authHeader = req.headers.authorization;
        // if (!authHeader || !authHeader.startsWith('Bearer ')) {
        //     return res.status(401).sendFile(path.join(__dirname, '../Errors/tokenExpire.html'));
        // }

        const token = authHeader.split(' ')[1];

        const userDetails = await getUserDetailsFromToken(token);

        // if (userDetails?.notvalid) {
        //     return res.status(401).sendFile(path.join(__dirname, '../Errors/tokenExpire.html'));
        // }

        req.user = userDetails; // Attach user details to the request object
        next(); // Proceed to the next middleware or controller
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = authenticateToken;
