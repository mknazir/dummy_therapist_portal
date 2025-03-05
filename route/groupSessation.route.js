const express = require('express');
const authenticateToken = require('../middleware/authToken.middleware');
const {createSessation, getGroupSessationDetials,getAllGroupSessions,addGuestListToGroupSession,updateGuestStatus,removeGuestFromSession,getGuestListFromGroupSession, getAllGroupSessionsForClient,clientsignupForGroupTherapy } =require('../controller/groupSessation.controller')



const groupSessationRouter = express.Router();


groupSessationRouter.post('/groupSessation/createGroupSessation',authenticateToken,createSessation);
groupSessationRouter.post('/groupSessation/getGroupSessationDetials',authenticateToken,getGroupSessationDetials);
groupSessationRouter.get('/groupSessation/getAllGroupSessions',authenticateToken,getAllGroupSessions)
groupSessationRouter.get('/groupSessation/getAllGroupSessionsForClient',authenticateToken,getAllGroupSessionsForClient)
groupSessationRouter.post('/groupSessation/addGuestListToGroupSession',authenticateToken,addGuestListToGroupSession)
groupSessationRouter.put('/groupSessation/updateGuestStatus',authenticateToken,updateGuestStatus)
groupSessationRouter.post('/groupSessation/removeGuestFromSession',authenticateToken,removeGuestFromSession)
groupSessationRouter.post('/groupSessation/getGuestListFromGroupSession',authenticateToken,getGuestListFromGroupSession)
groupSessationRouter.post('/groupSessation/clientsignupForGroupTherapy',authenticateToken,clientsignupForGroupTherapy)




module.exports = groupSessationRouter