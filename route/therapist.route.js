const express = require("express");
const authenticateToken = require("../middleware/authToken.middleware");
const {
  getTherapistList,
  getTherapistDetail,
  updateTherapistDetail,
  getTherapistSessionSlots,
  getTherapistPreconsultationSlots,
  getMonthlyAppointmentData,
  getEarningsAndCounts,
  getAppointmentEarningsByType,
  getAppoitnmentEarningpermonth,
  addTherapist,
  addSessionPricing,
  getSessionPricing,
  updateSessionPricing,
  deleteSessionPricing,
  removeTherapist,
  getEarningsByTherapist,
  getAllAppointmentDataPerMonth,
  getAllLiveChatDataPerMonth,
} = require("../controller/therapist.controller");
// Import the controllers

// Create a new router
const therapistRouter = express.Router();

// Define the routes using authRouter, not router

therapistRouter.get("/listOfTherapist", authenticateToken, getTherapistList);
therapistRouter.get(
  "/therapistDetail/:therapistId",
  authenticateToken,
  getTherapistDetail
);
therapistRouter.post(
  "/addTherapist",
  authenticateToken,
  addTherapist
);
therapistRouter.post(
  "/updateTherapistDetail",
  authenticateToken,
  updateTherapistDetail
);
therapistRouter.get(
  "/getTherapistSessionSlots/:therapistId",
  authenticateToken,
  getTherapistSessionSlots
);
therapistRouter.get(
  "/getPreconsultationSlotsByTherapist/:therapistId",
  authenticateToken,
  getTherapistPreconsultationSlots
);
therapistRouter.get(
  "/removeTherapist/:therapistId",
  authenticateToken,
  removeTherapist
);
therapistRouter.post(
  "/getEarningsByTherapist",
  authenticateToken,
  getEarningsByTherapist
);
therapistRouter.get(
  "/getMonthlyAppointmentData",
  authenticateToken,
  getMonthlyAppointmentData
);
therapistRouter.get(
  "/getAllAppointmentDataPerMonth",
  authenticateToken,
  getAllAppointmentDataPerMonth
);
therapistRouter.get(
  "/getAllLiveChatDataPerMonth",
  authenticateToken,
  getAllLiveChatDataPerMonth
);
therapistRouter.post(
  "/getEarningsAndCounts",
  authenticateToken,
  getEarningsAndCounts
);
therapistRouter.post(
  "/addSessionPricing",
  authenticateToken,
  addSessionPricing
);
therapistRouter.post(
  "/getSessionPricing",
  authenticateToken,
  getSessionPricing
);
therapistRouter.post(
  "/updateSessionPricing",
  authenticateToken,
  updateSessionPricing
);
therapistRouter.post(
  "/deleteSessionPricing",
  authenticateToken,
  deleteSessionPricing
);
therapistRouter.get(
  "/getAppointmentEarningsByType",
  authenticateToken,
  getAppointmentEarningsByType
);
therapistRouter.get(
  "/getAppoitnmentEaringpermonth",
  authenticateToken,
  getAppoitnmentEarningpermonth
);
// Export the router
module.exports = therapistRouter;
