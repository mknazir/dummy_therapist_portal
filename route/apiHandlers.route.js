const express = require('express');
const authenticateToken = require('../middleware/authToken.middleware');
const { getSpeciality, getStateList, getConcern, generateOTPs, validateOTP, sendMeetLink, getProfileDetail, getDashboardCounterByTherapist, uploadImage, addWalletAmount, getWalletDetails, addConcern, addSubConcern, addFaqs, getConcernByRole, getFaqsByConcernAndSubConcern, editConcern, editSubConcern, editFaq, deleteConcern, deleteSubConcern, deleteFaq, addUserType, editUserType, deleteUserType, geAllUserTypes, AddExpertise, getAllExpertise, getExpertiseById, updateExpertise, deleteExpertise, AddSpecialization, getAllSpecialization, getSpecializationById, updateSpecialization, deleteSpecialization, getConcernById, getSubConcernById, getAllConcerns, getFaqsByConcern } = require('../controller/apiHandlers.controller');
const { analyzeSentiment } = require('../controller/sentiment.controller');


// Create a new router
const apiHandlersRouter = express.Router();

// Define the routes using authRouter, not router

apiHandlersRouter.get('/getSpeciality', authenticateToken, getSpeciality);
apiHandlersRouter.get('/getStateList', authenticateToken, getStateList);
apiHandlersRouter.get('/getConcern', authenticateToken, getConcern);
apiHandlersRouter.get('/validateOTP', authenticateToken, validateOTP);
apiHandlersRouter.get('/generateOTPs', authenticateToken, generateOTPs);
apiHandlersRouter.post('/sendMeetLink', sendMeetLink);
apiHandlersRouter.get('/getProfileDetail', authenticateToken, getProfileDetail);
apiHandlersRouter.post('/getDashboardCounterByTherapist', authenticateToken, getDashboardCounterByTherapist);
apiHandlersRouter.get('/uploadImage', authenticateToken, uploadImage);
apiHandlersRouter.post('/addWalletAmount', authenticateToken, addWalletAmount);
apiHandlersRouter.post('/getWalletDetails', authenticateToken, getWalletDetails);
apiHandlersRouter.post('/addConcern',authenticateToken, addConcern);
apiHandlersRouter.get('/getAllConcerns',authenticateToken, getAllConcerns);
apiHandlersRouter.post('/getConcernById',authenticateToken, getConcernById);
apiHandlersRouter.post('/getSubConcernById',authenticateToken, getSubConcernById);
apiHandlersRouter.post('/addSubConcern',authenticateToken, addSubConcern);
apiHandlersRouter.post('/addFaqs',authenticateToken, addFaqs);
apiHandlersRouter.post('/editConcern',authenticateToken, editConcern);
apiHandlersRouter.post('/editSubConcern',authenticateToken, editSubConcern);
apiHandlersRouter.post('/editFaq',authenticateToken, editFaq);
apiHandlersRouter.post('/getConcernByRole',authenticateToken, getConcernByRole);
apiHandlersRouter.post('/deleteConcern',authenticateToken, deleteConcern);
apiHandlersRouter.post('/deleteSubConcern',authenticateToken, deleteSubConcern);
apiHandlersRouter.post('/deleteFaq',authenticateToken, deleteFaq);
apiHandlersRouter.post('/getFaqsByConcernAndSubConcern',authenticateToken, getFaqsByConcernAndSubConcern);
apiHandlersRouter.post('/getFaqsByConcern', getFaqsByConcern);
apiHandlersRouter.post('/addUserType',authenticateToken, addUserType);
apiHandlersRouter.get('/getAllUserTypes',authenticateToken, geAllUserTypes);
apiHandlersRouter.post('/editUserType',authenticateToken, editUserType);
apiHandlersRouter.post('/deleteUserType',authenticateToken, deleteUserType);
apiHandlersRouter.post('/AddExpertise',authenticateToken, AddExpertise);
apiHandlersRouter.get('/getAllExpertise',authenticateToken, getAllExpertise);
apiHandlersRouter.post('/getExpertiseById',authenticateToken, getExpertiseById);
apiHandlersRouter.post('/updateExpertise',authenticateToken, updateExpertise);
apiHandlersRouter.post('/deleteExpertise',authenticateToken, deleteExpertise);
apiHandlersRouter.post('/AddSpecialization',authenticateToken, AddSpecialization);
apiHandlersRouter.get('/getAllSpecialization',authenticateToken, getAllSpecialization);
apiHandlersRouter.post('/getSpecializationById',authenticateToken, getSpecializationById);
apiHandlersRouter.post('/updateSpecialization',authenticateToken, updateSpecialization);
apiHandlersRouter.post('/deleteSpecialization',authenticateToken, deleteSpecialization);
apiHandlersRouter.post('/analyze', analyzeSentiment);
// Export the router
module.exports = apiHandlersRouter;