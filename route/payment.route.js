const express = require('express');
const authenticateToken = require('../middleware/authToken.middleware');
const { createOrder, verifyOrder,createPaymentLink,handleWebhook } = require('../controller/payment.controller');


const paymentRouter = express.Router();

paymentRouter.post('/payment/createOrder', authenticateToken, createOrder);
paymentRouter.post('/payment/verifyOrder', authenticateToken, verifyOrder);
paymentRouter.post('/payment/createPaymentLink', authenticateToken, createPaymentLink);
paymentRouter.post('/payment/webhook', handleWebhook);

module.exports = paymentRouter;