const Razorpay = require("razorpay");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const {sendTemplatedEmail} = require('../SES/ses.js')
// const razorpay = new Razorpay({
//   key_id: "rzp_test_IqmS1BltCU4SFU",
//   key_secret: "tJA2Z7X9lDyG8FHfmZ6J2qv6",
// });
const razorpay = new Razorpay({
  key_id: "rzp_live_IIwhdZvx1c4BGz",
  key_secret: "MKwPrI8XsBlj2cmzbuFnZ51s",
});
const RAZORPAY_WEBHOOK_SECRET = 'EnsoInnovationLab';


const createOrder = async (req, res) => {
  try {
    console.log("isnide create order", req.body);
    const options = {
      amount: req.body.amount * 100, // amount in the smallest currency unit
      currency: "INR",
      receipt: uuidv4(),
    };

    const order = await razorpay.orders.create(options);
    console.log("iside order crate", order);
    return res.status(200).json(order);
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const verifyOrder = async (req, res) => {
  console.log("iside verify", req.body);

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const hmac = crypto.createHmac("sha256", razorpay.key_secret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest("hex");

    if (generated_signature === razorpay_signature) {
      console.log("isnide success");
      return res
        .status(200)
        .json({ message: "'Payment verified successfully.')" });
    } else {
      console.log("isnide failure");
      return res
        .status(400)
        .json({ message: "'Payment verification failed.')" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const createPaymentLink = async (req, res) => {
  const { name, email, phone_number, amount, currency, therapist_id, user_id, payment_mode, appointment_id, type } = req.body;

  // Map the `type` to its corresponding value (e.g., post or preconsultation)
  let typeValue;
  if (type === "session") {
    typeValue = "post";
  } else if (type === "preconsultation") {
    typeValue = "pre";
  } else {
    return res.status(400).json({ error: "Invalid type provided" });
  }

  const currentTimeInSeconds = Math.floor(Date.now() / 1000);
  const expirationDuration = 20 * 60; // 20 minutes in seconds
  const expireBy = currentTimeInSeconds + expirationDuration;

  const options = {
    amount: amount * 100, // Amount in paise
    currency: currency,
    accept_partial: false,
    description: "Payment via Link",
    customer: {
      contact: phone_number,
      email: email,
    },
    notify: {
      sms: true,
      email: true,
    },
    reminder_enable: true,
    expire_by: expireBy,
    notes: {
      name,
      amount,
      therapist_id,
      user_id,
      payment_mode,
      appointment_id,
      type: typeValue, // Mapped type
    },
  };

  try {
    const response = await razorpay.paymentLink.create(options);
    const paymentLink = response.short_url;

    // Prepare email content
    const templateData = {
      name,
      paymentLink, 
    };

    // Send payment link via email
    await sendTemplatedEmail([email], 'SendPaymentLink', templateData);

    res.status(200).json({ message: 'Payment link created and email sent successfully', paymentLink });
  } catch (error) {
    console.error('Error creating payment link or sending email:', error);
    res.status(500).json({ error: 'Error creating payment link or sending email' });
  }
};





const handleWebhook = async (req, res) => {

  console.log("webhook called");
  const receivedSignature = req.headers['x-razorpay-signature'];
  const requestBody = JSON.stringify(req.body);

  // Verifying webhook signature
  const expectedSignature = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(requestBody)
    .digest('hex');

  if (receivedSignature === expectedSignature) {
    const event = req.body.event;

    // Only handle 'payment_link.paid' event
    if (event === 'payment_link.paid') {
      const paymentLinkEntity = req.body.payload.payment_link.entity;
      const paymentDetails = paymentLinkEntity;

      // Extracting necessary fields from payload
      const { name, amount, therapist_id, user_id, payment_mode, appointment_id, type } = paymentLinkEntity.notes;
      const { order_id, payment_id } = paymentLinkEntity; // Extract order_id and payment_id from paymentLinkEntity

      // Additional fields to store
      const drcr = "Debit"; // Credit or Debit transaction indicator

      // Get the current date and time
      const currentDate = new Date();
      const date = currentDate.toISOString(); // Store the ISO date format
      const time = currentDate.toTimeString().split(' ')[0]; // Extract only "HH:MM:SS" from time

      // Log the details
      console.log('Payment via link was successful!', paymentDetails);
      console.log('Name:', name);
      console.log('Amount:', amount);
      console.log('Therapist ID:', therapist_id);
      console.log('User ID:', user_id);
      console.log('Payment Mode:', payment_mode);
      console.log('Appointment ID:', appointment_id);
      console.log('Type:', type); // "post" or "pre"
      console.log('Order ID:', order_id); // Extracted order_id
      console.log('Payment ID:', payment_id); // Extracted payment_id
      console.log('Dr/Cr:', drcr); // Transaction type
      console.log('Date:', date); // Current date in ISO format
      console.log('Time:', time); // Current time in "HH:MM:SS" format

      // Here you can handle the data, store it in the database with additional fields
      // For example: Save order_id, payment_id, drcr, date, and time in the database

      res.status(200).json({ 
        status: 'success', 
        message: 'Payment link paid', 
        paymentDetails: {
          name,
          amount,
          therapist_id,
          user_id,
          payment_mode,
          appointment_id,
          type,
          order_id,
          payment_id,
          drcr,
          date,
          time
        }
      });
    } else {
      // Ignore other events and return success response
      res.status(200).json({ status: 'ignored', message: 'Event not processed' });
    }
  } else {
    res.status(400).json({ status: 'failed', message: 'Invalid signature' });
  }
};
module.exports = { createOrder, verifyOrder,createPaymentLink,handleWebhook };
