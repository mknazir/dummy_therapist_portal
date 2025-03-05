const express = require('express');
const authenticateToken = require('../middleware/authToken.middleware');
const { sendPreReferral, getGivenPreconsultationReferralList, getReceivedPreconsultationReferralList, acceptPreReferral, sendSessionReferral, acceptSessionReferral, getGivenSessionReferralList, getReceivedSessionReferralList, getListOfTherapistSuggested } = require('../controller/referal.controller');

// Import the controllers

// Create a new router
const referalRouter = express.Router();

// Define the routes using referalRouter, not router
referalRouter.post('/sendPreReferral',authenticateToken , sendPreReferral);
referalRouter.post('/sendSessionReferral',authenticateToken , sendSessionReferral);
referalRouter.post('/acceptSessionReferral',authenticateToken , acceptSessionReferral);
referalRouter.post('/acceptPreReferral',authenticateToken , acceptPreReferral);
referalRouter.get('/getGivenPreconsultationReferralList',authenticateToken , getGivenPreconsultationReferralList);
referalRouter.get('/getGivenSessionReferralList',authenticateToken , getGivenSessionReferralList);
referalRouter.get('/getReceivedPreconsultationReferralList',authenticateToken , getReceivedPreconsultationReferralList);
referalRouter.get('/getReceivedSessionReferralList',authenticateToken , getReceivedSessionReferralList);
referalRouter.get('/getListOfTherapistSuggestedToUser',authenticateToken,getListOfTherapistSuggested)

// Export the router
module.exports = referalRouter;