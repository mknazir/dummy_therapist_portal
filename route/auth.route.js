const express = require('express');

// Import the controllers
const { userSignup, therapistSignup, userSignin, therapistSignin,adminLogin,forgetPassword } = require('../controller/auth.controller');
const {sendOtpWithSms,sendOtpWithEmail,validateOTP,userAuthForMobile,refreshToken} = require('../controller/apiHandlers.controller')

// Create a new router
const authRouter = express.Router();

// Define the routes using authRouter, not router
authRouter.post('/auth/userSignup', userSignup);
authRouter.post('/auth/therapistSignup', therapistSignup);
authRouter.post('/auth/userSignin', userSignin);
authRouter.post('/auth/therapistSignin', therapistSignin);
authRouter.post('/auth/sendOtpWithSms',sendOtpWithSms)
authRouter.post('/auth/sendOtpWithEmail',sendOtpWithEmail)
authRouter.post('/auth/validateOTP',validateOTP)
authRouter.post('/auth/userAuthForMobile',userAuthForMobile)
authRouter.post('/auth/refreshToken',refreshToken)
authRouter.post('/admin/login',adminLogin)
authRouter.post('/admin/forgetPassword',forgetPassword)



// Export the router
module.exports = authRouter;