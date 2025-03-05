const { ObjectId } = require("mongodb");
const { getDb } = require("../db/db");
const nodemailer = require("nodemailer");
const validator = require("validator");
const { sendSMS } = require("../SNS/sns");
const { sendTemplatedEmail } = require("../SES/ses");
const { generateSignedUrl } = require("../S3/s3");
const jwt = require("jsonwebtoken");
const indiaStates = [
  {
    state_id: 1,
    state_name: "Andaman and Nicobar Islands",
    location: "Islands",
  },
  { state_id: 2, state_name: "Andhra Pradesh", location: "Southern India" },
  {
    state_id: 3,
    state_name: "Arunachal Pradesh",
    location: "North-Eastern India",
  },
  { state_id: 4, state_name: "Assam", location: "North-Eastern India" },
  { state_id: 5, state_name: "Bihar", location: "Eastern India" },
  { state_id: 6, state_name: "Chandigarh", location: "Northern India" },
  { state_id: 7, state_name: "Chhattisgarh", location: "Central India" },
  {
    state_id: 8,
    state_name: "Dadra and Nagar Haveli",
    location: "Western India",
  },
  { state_id: 9, state_name: "Daman and Diu", location: "Western India" },
  { state_id: 10, state_name: "Delhi", location: "Northern India" },
  { state_id: 11, state_name: "Goa", location: "Western India" },
  { state_id: 12, state_name: "Gujarat", location: "Western India" },
  { state_id: 13, state_name: "Haryana", location: "Northern India" },
  { state_id: 14, state_name: "Himachal Pradesh", location: "Northern India" },
  { state_id: 15, state_name: "Jammu and Kashmir", location: "Northern India" },
  { state_id: 16, state_name: "Jharkhand", location: "Eastern India" },
  { state_id: 17, state_name: "Karnataka", location: "Southern India" },
  { state_id: 18, state_name: "Kerala", location: "Southern India" },
  { state_id: 19, state_name: "Ladakh", location: "Northern India" },
  { state_id: 20, state_name: "Lakshadweep", location: "Islands" },
  { state_id: 21, state_name: "Madhya Pradesh", location: "Central India" },
  { state_id: 22, state_name: "Maharashtra", location: "Western India" },
  { state_id: 23, state_name: "Manipur", location: "North-Eastern India" },
  { state_id: 24, state_name: "Meghalaya", location: "North-Eastern India" },
  { state_id: 25, state_name: "Mizoram", location: "North-Eastern India" },
  { state_id: 26, state_name: "Nagaland", location: "North-Eastern India" },
  { state_id: 27, state_name: "Odisha", location: "Eastern India" },
  { state_id: 28, state_name: "Puducherry", location: "Southern India" },
  { state_id: 29, state_name: "Punjab", location: "Northern India" },
  { state_id: 30, state_name: "Rajasthan", location: "Western India" },
  { state_id: 31, state_name: "Sikkim", location: "North-Eastern India" },
  { state_id: 32, state_name: "Tamil Nadu", location: "Southern India" },
  { state_id: 33, state_name: "Telangana", location: "Southern India" },
  { state_id: 34, state_name: "Tripura", location: "North-Eastern India" },
  { state_id: 35, state_name: "Uttar Pradesh", location: "Northern India" },
  { state_id: 36, state_name: "Uttarakhand", location: "Northern India" },
  { state_id: 37, state_name: "West Bengal", location: "Eastern India" },
];

const concern = [
  { name: "Addiction" },
  { name: "ADHD" },
  { name: "Adjustment Challenges" },
  { name: "Anger" },
  { name: "Anxiety" },
  { name: "Bipolar Affective Disorder" },
  { name: "Career Counseling" },
  { name: "Couple Therapy" },
  { name: "Depression" },
  { name: "Eating Disorders and Body Image" },
  { name: "Family Therapy" },
  { name: "General Wellbeing" },
  { name: "Grief and Trauma" },
  { name: "Loneliness" },
  { name: "Loss of Motivation" },
  { name: "Negative Thinking" },
  { name: "OCD" },
  { name: "Overthinking" },
  { name: "Procrastination" },
  { name: "Relationship and Marriage" },
  { name: "Self Esteem" },
  { name: "Sexual Dysfunction" },
  { name: "Sleep Disturbance" },
  { name: "Stress" },
];

const specialties = [
  { name: "Career and Guidance Psychologist" },
  { name: "CBT Practitioner" },
  { name: "Child and Adolescent Psychologist" },
  { name: "Clinical Psychologist" },
  { name: "Counseling Psychologist" },
  { name: "Deaddiction Psychologist" },
  { name: "Expressive Art Therapist" },
  { name: "Jungian-Oriented Therapist" },
  { name: "Hypnotherapist" },
  { name: "Psychiatrist" },
  { name: "Psychiatric Social Worker" },
  { name: "Psychotherapist" },
  { name: "Psycho Oncologist" },
  { name: "REBT Practitioner" },
];

const getStateList = async (req, res) => {
  try {
    return res.status(200).json({
      message: "State Retrive successfully",
      data: indiaStates,
    });
  } catch (error) {
    console.log("Error while getting location:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getConcern = async (req, res) => {
  try {
    return res.status(200).json({
      message: "Concern Retrive successfully",
      data: concern,
    });
  } catch (error) {
    console.log("Error while getting concern:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getSpeciality = async (req, res) => {
  try {
    return res.status(200).json({
      message: "specialties Retrive successfully",
      data: specialties,
    });
  } catch (error) {
    console.log("Error while getting specialties:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "mdadilakhtar8@gmail.com",
    pass: "btpzwrbvrikfhrxp",
  },
});

const sendMeetLink = async (req, res) => {

  try {
    const db = getDb();
    const usersCollection = db.collection("users");

    const { user_email, meet_link, topic } = req.body;

    const user = await usersCollection.findOne({ email: user_email });

    if (!user_email || !validator.isEmail(user_email)) {
      return res
        .status(400)
        .json({ message: "Invalid email format.", error: true });
    }

    const templateData = {
      RecipientName: user?.name,
      meetingLink : meet_link,
      topic : topic
    }

    sendTemplatedEmail([user_email],"MeetConnect",templateData)

    return res.status(200).json({
      message: "Meeting link generated successfully.",
      data: { meetLink },
    });
  } catch (error) {
    console.log("Error generating meeting link:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.toString() });
  }
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

function sendOTPEmail(email) {
  const otp = generateOTP();

  const mailOptions = {
    from: "mdadilakhtar8@gmail.com",
    to: email,
    subject: "OTP Verification",
    text: `Your OTP for email verification: ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });

  return otp; // Return the OTP for further verification
}

const generateOTPs = async (req, res) => {
  console.log("Request received with body:", req.body);
  try {
    const db = getDb();
    const { email } = req.body;
    const collection = await db.collection("users");

    if (!email || !validator.isEmail(email)) {
      return res
        .status(400)
        .json({ message: "Invalid email format.", error: true });
    }

    const otp = sendOTPEmail(email);
    console.log(otp);
    const user = await collection.findOneAndUpdate(
      { email: email },
      { $set: { otp: otp } },
      { returnOriginal: false }
    );

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found or inactive.", error: true });
    }

    console.log("OTP generated and saved successfully for:", email);
    return res
      .status(200)
      .json({ message: "OTP generated successfully.", data: { otp } });
  } catch (error) {
    console.log("Error generating OTP:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.toString() });
  }
};

const validateOTP = async (req, res) => {
  console.log("Request received with body:", req.body);

  try {
    const db = getDb();
    const { email, phoneNumber, otp, role } = req.body;

    // Validate input: OTP, role, and either email or phoneNumber are required
    if (!otp || (!email && !phoneNumber)) {
      return res.status(400).json({
        message:
          "OTP, role, and either email or phone number are required (not both).",
        error: true,
      });
    }

    // Find user based on email or phone number
    const collection = await db.collection("users");
    const user = await collection.findOne({
      $or: [
        email ? { email: email } : null,
        phoneNumber ? { phone_number: phoneNumber } : null,
      ].filter(Boolean),
    });

    // If user not found
    if (!user) {
      return res.status(404).json({ message: "User not found.", error: true });
    }

    // Check if the OTP matches
    // if (user.otp !== otp) {
    //   return res.status(401).json({ message: "Incorrect OTP.", error: true });
    // }

    console.log("OTP validated successfully for:", email || phoneNumber);

    // Fetch additional details based on the user role
    if (user.role === "therapist") {
      const concernsCollection = db.collection("concerns");
      const expertiseCollection = db.collection("expertise");
      const specializationCollection = db.collection("specialization");

      // Fetch concerns details
      const concernsWithTitle = user.concerns
        ? await concernsCollection
            .find({ _id: { $in: user.concerns.map(id => new ObjectId(id)) } })
            .project({ _id: 1, concern: 1 })
            .toArray()
        : [];

      // Fetch expertise details
      const expertiseWithTitle = user.expertise
        ? await expertiseCollection
            .find({ _id: { $in: user.expertise.map(id => new ObjectId(id)) } })
            .project({ _id: 1, name: 1 })
            .toArray()
        : [];

      // Fetch specialization details
      const specializationWithTitle = user.specialization
        ? await specializationCollection
            .find({ _id: { $in: user.specialization.map(id => new ObjectId(id)) } })
            .project({ _id: 1, name: 1 })
            .toArray()
        : [];

      // Attach the fetched details to the user object
      user.concerns = concernsWithTitle;
      user.expertise = expertiseWithTitle;
      user.specialization = specializationWithTitle;
    }

    if (user.role === "user") {
      const concernsCollection = db.collection("concerns");
      const userTypesCollection = db.collection("userTypes");

      // Fetch userType details
      if (user.userType) {
        const userType = await userTypesCollection.findOne({ _id: new ObjectId(user.userType) });
        user.userType = userType || {};
      }

      // Fetch concerns details
      let concernsWithTitle = [];
      let subConcernsWithTitle = [];

      if (user.concerns && user.concerns.length > 0) {
        concernsWithTitle = await concernsCollection
          .find({ _id: { $in: user.concerns.map(id => new ObjectId(id)) } })
          .project({ _id: 1, concern: 1 })
          .toArray();
      }

      if (user.subConcerns && user.subConcerns.length > 0) {
        // Fetch all concerns and filter subConcerns manually
        const allConcerns = await concernsCollection
          .find({}, { projection: { _id: 1, subConcerns: 1 } })
          .toArray();

        subConcernsWithTitle = user.subConcerns.map(subConcernId => {
          for (const concern of allConcerns) {
            const foundSubConcern = concern.subConcerns?.find(sc => sc._id.toString() === subConcernId.toString());
            if (foundSubConcern) {
              return { _id: foundSubConcern._id, subConcern: foundSubConcern.subConcern };
            }
          }
          return null;
        }).filter(Boolean); // Remove null values
      }

      // Attach concerns and subConcerns names to the user object
      user.concerns = concernsWithTitle;
      user.subConcerns = subConcernsWithTitle;
    }

    // Generate token (for authentication purposes)
    const token = jwt.sign(
      { _id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1d" }
    );

    const refreshToken = jwt.sign(
      { _id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "365d" } // Longer expiration time
    );

    // Store Refresh Token in DB
    await collection.updateOne(
      { _id: user._id },
      { $set: { refreshToken } }
    );

    return res.status(200).json({
      message: "Sign-in successful",
      data: {
        ...user,
        token,
        refreshToken
      },
    });
  } catch (error) {
    console.error("Error validating OTP:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.toString() });
  }
};

const refreshToken = async (req, res) => {
  try {
    const db = getDb();
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required." });
    }

    // Verify refresh token
    jwt.verify(refreshToken, process.env.JWT_SECRET_KEY, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Invalid refresh token." });
      }

      const user = await db.collection("users").findOne({ _id: new ObjectId(decoded._id) });

      if (!user || user.refreshToken !== refreshToken) {
        return res.status(403).json({ message: "Refresh token is not valid." });
      }

      // Generate a new access token
      const newAccessToken = jwt.sign(
        { _id: user._id, role: user.role },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1d" }
      );

      res.status(200).json({
        accessToken: newAccessToken,
      });
    });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const sendOtpWithSms = async (req, res) => {
  const { phoneNumber, countryCode , role } = req.body;

  // Validate the input
  if (!phoneNumber || !countryCode) {
    return res
      .status(400)
      .json({ message: "Phone number and country code are required." });
  }

  const db = getDb();
  const usersCollection = db.collection("users");

  try {
    // Check if user exists with the given phone number
    const user = await usersCollection.findOne({ phone_number: phoneNumber });
    console.log("user>>", user);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User with this phone number does not exist." });
    }

    // Check if the user's role is therapist
    if (user.role !== role) {
      return res
        .status(403)
        .json({ message: `This action is restricted to ${role} only.` });
    }

    // Generate the OTP
    const otp = generateOTP();
    console.log(otp);
    console.log(typeof otp);

    // Save OTP directly in the user's document
    await usersCollection.updateOne(
      { phone_number: phoneNumber },
      { $set: { otp } }
    );

    // Send OTP via SMS
    const fullPhoneNumber = `${countryCode}${phoneNumber}`;
    console.log("fullPhoneNumber", fullPhoneNumber);

    const message = `Your OTP is ${otp}. Please do not share it with anyone.`;

    await sendSMS(fullPhoneNumber, message);

    res.status(200).json({ message: "OTP sent successfully." });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send OTP." });
  }
};

const sendOtpWithEmail = async (req, res) => {
  const { email , role } = req.body;

  // Validate the input
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  const db = getDb();
  const usersCollection = db.collection("users");

  try {
    // Check if user exists with the given phone number
    const user = await usersCollection.findOne({ email });
    console.log("user>>", user);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User with this email does not exist." });
    }

    // Check if the user's role is therapist
    if (user.role !== role) {
      return res
        .status(403)
        .json({ message: `This action is restricted to ${role} only.` });
    }

    // Generate the OTP
    const otp = generateOTP();
    console.log(otp);
    console.log(typeof otp);

    // Save OTP directly in the user's document
    await usersCollection.updateOne({ email }, { $set: { otp } });

    // Send OTP via SMS
    const templateData = {
      otp: otp.toString(),
    };

    // Ensure the email is an array, as required by the sendTemplatedEmail function
    await sendTemplatedEmail([user.email], "OTPAuthentication", templateData);

    res.status(200).json({ message: "OTP sent successfully." });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send OTP." });
  }
};

const userAuthForMobile = async (req, res) => {
  try {
    const db = getDb();
    const { email, phone_number, countryCode, role } = req.body;
    console.log(req.body);

    if (!email && !phone_number) {
      return res.status(400).json({ message: "Either email or phone_number is required" });
    }

    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    const otp = generateOTP();

    let user = null;

    // Step 1: Search by email first (if provided)
    if (email) {
      user = await db.collection("users").findOne({ email });
      
      if (user) {
        if (user.role !== role) {
          return res.status(400).json({ message: "Role mismatch for the provided email" });
        }
      }
    }

    // Step 2: If email is not found, search by phone_number (if provided)
    if (!user && phone_number) {
      user = await db.collection("users").findOne({ phone_number });

      if (user) {
        if (user.role !== role) {
          return res.status(400).json({ message: "Role mismatch for the provided phone number" });
        }
      }
    }

    // Step 3: If no user exists, create a new user
    if (!user) {
      const newUser = {
        email: email || "",
        phone_number: phone_number || null,
        role,
        newUser: true,
        userType: "",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("users").insertOne(newUser);
      newUser._id = result.insertedId;
      user = newUser;
    }

    // Step 4: Send OTP via email or SMS
    const templateData = { otp: otp.toString() };

    if (email) {
      await sendTemplatedEmail([email], "OTPAuthentication", templateData);
    } else if (phone_number && countryCode) {
      const fullPhoneNumber = `${countryCode}${phone_number}`;
      const message = `Your OTP is ${otp}. Please do not share it with anyone.`;
      await sendSMS(fullPhoneNumber, message);
    } else {
      return res.status(400).json({ message: "Invalid input: countryCode is required with phone_number" });
    }

    // Step 5: Store OTP in the database
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { otp } }
    );

    res.status(200).json({
      message: "OTP sent successfully",
      user: {
        _id: user._id,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        newUser: user.newUser,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getProfileDetail = async (req, res) => {
  try {
    const db = getDb();
    const profileDetails = req.user;

    const userCollection = await db.collection("users");
    // Query to find the profile by Object ID, excluding the password field
    const profile = await userCollection.findOne(
      { _id: new ObjectId(profileDetails._id) },
      { projection: { password: 0 } }
    );

    if (!profile) {
      return res.status(404).json({
        message: "Therapist not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "profile details retrieved successfully.",
      data: profile,
    });
  } catch (error) {
    console.log("Error retrieving profile details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getDashboardCounterByTherapist = async (req, res) => {
  try {
    const db = getDb();
    const {therapistId} = req.body

    let totalClients = 0;
    let groupSessionsConducted = 0;
    let liveChats = 0;
    let todaysAppointments = 0;
    let todaysPreConsultations = 0;
    let referralsGiven = 0;
    let referralsReceived = 0;
    let faqRequests = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to start of the day
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Next day to compare less than tomorrow

    // Fetch therapist details from users collection
    const therapistDetails = await db.collection("users").findOne({
      _id: new ObjectId(therapistId),
    });

    if (!therapistDetails) {
      return res.status(404).json({
        message: "Therapist not found.",
        error: true,
      });
    }

    // Set the groupSessionsConducted based on the length of groupSession array
    groupSessionsConducted = therapistDetails.groupSessation ? therapistDetails.groupSessation.length : 0;

    // Today's appointments (where the booking date is within today)
    todaysAppointments = await db
      .collection("appointments")
      .find({
        therapist_id: new ObjectId(therapistId),
        booking_date: {
          $gte: today, // Greater than or equal to today's date (start of day)
          $lt: tomorrow, // Less than tomorrow (end of today's day)
        },
      })
      .count();

    // Pre-consultations for today (where the booking date is within today)
    todaysPreConsultations = await db
      .collection("appointments")
      .find({
        therapist_id: new ObjectId(therapistId),
        type: "preconsultation",
        booking_date: {
          $gte: today, // Greater than or equal to today's date (start of day)
          $lt: tomorrow, // Less than tomorrow (end of today's day)
        },
      })
      .count();

    // Total clients (unique clients related to the therapist's appointments)
    const appointments = await db
      .collection("appointments")
      .find({
        therapist_id: new ObjectId(therapistId),
      })
      .toArray();

    const uniqueClientIds = [
      ...new Set(appointments.map((app) => app.user_id.toString())),
    ];

    totalClients = uniqueClientIds.length;

    // Given referrals
    referralsGiven = await db
      .collection("referrals")
      .find({
        referrer_id: new ObjectId(therapistId),
      })
      .count();

    // Received referrals
    referralsReceived = await db
      .collection("referrals")
      .find({
        "therapists.therapist_id": new ObjectId(therapistId),
      })
      .count();

    // FAQ requests (assuming FAQs are related to this therapist)
    // const faqRequests = await db
    //   .collection("faqs")
    //   .find({
    //     therapist_id: new ObjectId(therapist._id),
    //   })
    //   .count();

    return res.status(200).json({
      message: "Dashboard data retrieved successfully.",
      data: {
        totalClients,
        groupSessionsConducted,
        liveChats,
        todaysAppointments,
        todaysPreConsultations,
        referralsGiven,
        referralsReceived,
        faqRequests,
      },
    });
  } catch (error) {
    console.error("Error retrieving dashboard data:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const uploadImage = async (req, res) => {
  try {
    const result = await generateSignedUrl();
    console.log("res", result);
    return res.status(200).json({
      message: "Get URL successfully.",
      data: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const addWalletAmount = async (req, res) => {
  try {
    const { amount, order_id, payment_id , userId } = req.body;

    if (!amount || !order_id || !payment_id || !userId) {
      return res.status(400).json({ message: "User ID is required.", error: true });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount.", error: true });
    }

    const userObjectId = new ObjectId(userId);

    // Get the database reference
    const db = getDb();
    const userCollection = db.collection("users");

    // Find the user by ID
    const user = await userCollection.findOne({ _id: userObjectId , role:"user" ,isActive:true });
    if (!user) {
      return res.status(404).json({ message: "User not found.", error: true });
    }

    // Calculate the new wallet amount
    const newWalletAmount = parseFloat(user.wallet_amount || 0) + parsedAmount;

    const currentTimeIST = new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata', // Set timezone to IST
      hour12: false,            // Use 24-hour format
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const result = await userCollection.updateOne(
      { _id: userObjectId, role:"user" ,isActive:true },
      {
        $set: {
          wallet_amount: newWalletAmount
        },
      }
    );

    const paymentHistory = {
      order_id: order_id,
      payment_id: payment_id,
      user_id: userObjectId,
      amount: parsedAmount,
      name: user.name,
      drcr: "Credit",
      date: new Date(),
      time: currentTimeIST,
      type:"wallet"
    }

    const paymentCollection = db.collection("payments");
    await paymentCollection.insertOne(paymentHistory);

    // Check if the update was successful
    if (result.modifiedCount === 0) {
      return res.status(500).json({
        message: "Failed to update wallet and payment history.",
        error: true,
      });
    }

    // Return success response
    return res.status(200).json({
      message: "Wallet amount added and payment history updated successfully.",
      wallet_amount: newWalletAmount,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getWalletDetails = async (req, res) => {
  try {
    const {userId} = req.body;

    const db = getDb();
    const collection = db.collection("users");
    const paymentCollection = db.collection("payments");

    // Fetch wallet amount and payment history for the user
    const user = await collection.findOne(
      { _id: new ObjectId(userId), role:"user" ,isActive:true },
      { projection: { wallet_amount: 1 } }
    );

    const paymentDetails = await paymentCollection.find(
      { user_id: new ObjectId(userId) }
    ).toArray();

    if (!user || !paymentDetails) {
      return res.status(404).json({
        message: "User not found or payment details not found",
        error: true,
      });
    }

    const { wallet_amount = 0 } = user;

    return res.status(200).json({
      message: "Wallet details retrieved successfully",
      wallet_amount,
      paymentDetails
    });
  } catch (error) {
    console.error("Error retrieving wallet details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getConcernById = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("concerns");

    const { concernId } = req.body;

    if (!ObjectId.isValid(concernId)) {
      return res.status(400).json({
        message: "Invalid concern ID",
        error: true,
      });
    }

    const concern = await collection.findOne({ _id: new ObjectId(concernId) });

    if (!concern) {
      return res.status(404).json({
        message: "Concern not found",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Concern retrieved successfully",
      concern,
    });
  } catch (error) {
    console.error("Error fetching concern:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getSubConcernById = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("concerns");

    const { concernId, subConcernId } = req.body;

    // Validate ObjectIds
    if (!ObjectId.isValid(concernId) || !ObjectId.isValid(subConcernId)) {
      return res.status(400).json({
        message: "Invalid concernId or subConcernId",
        error: true,
      });
    }

    // Find the concern document containing the subConcern
    const concern = await collection.findOne(
      {
        _id: new ObjectId(concernId),
        "subConcerns._id": new ObjectId(subConcernId),
        isActive: true,
      },
      {
        projection: { subConcerns: 1 }, // Fetch only subConcerns
      }
    );

    if (!concern || !concern.subConcerns) {
      return res.status(404).json({
        message: "Concern or SubConcern not found",
        error: true,
      });
    }

    // Extract the specific subConcern
    const subConcern = concern.subConcerns.find(
      (sc) => sc._id.toString() === subConcernId
    );

    if (!subConcern) {
      return res.status(404).json({
        message: "SubConcern not found in the given concern",
        error: true,
      });
    }

    return res.status(200).json({
      message: "SubConcern retrieved successfully",
      subConcern,
    });
  } catch (error) {
    console.error("Error fetching subConcern:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const addConcern = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("concerns");

    const { userType, concern,concernImage , concernWaterMark , description} = req.body;

    if (!userType || !concern || !concernImage || !concernWaterMark || !description) {
      return res.status(400).json({
        message: "userType and concern are required.",
        error: true,
      });
    }

    const newConcern = {
      userType: new ObjectId(userType),
      concern,
      concernImage,
      concernWaterMark,
      description,
      subConcerns: [],
      isActive:true,
      created_at: new Date(),
    };

    const result = await collection.insertOne(newConcern);

    return res.status(201).json({
      message: "Concern added successfully.",
      concernId: result.insertedId,
    });
  } catch (error) {
    console.error("Error adding concern:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAllConcerns = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("concerns");

    const concerns = await collection
      .find({ isActive: true }) // Fetch only active concerns
      .project({ _id: 1, concern: 1 }) // Select only `_id` and `concern`
      .toArray();

    return res.status(200).json({
      message: "Concerns retrieved successfully.",
      data: concerns,
    });
  } catch (error) {
    console.error("Error retrieving concerns:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const addSubConcern = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("concerns");

    const { concernId, subConcern } = req.body;

    if (!concernId || !subConcern) {
      return res.status(400).json({
        message: "Concern ID and subConcern are required.",
        error: true,
      });
    }

    const newSubConcern = {
      _id: new ObjectId(),
      subConcern,
      faqs: [],
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(concernId), isActive:true },
      { $push: { subConcerns: newSubConcern } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Concern not found.", error: true });
    }

    return res.status(201).json({
      message: "SubConcern added successfully.",
      subConcernId: newSubConcern._id,
    });
  } catch (error) {
    console.error("Error adding subConcern:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const addFaqs = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("concerns");
    const { concernId, subConcernId, faq } = req.body;

    if (!concernId || !subConcernId || !faq || !faq.question || !faq.answer || !faq.therapistId) {
      return res.status(400).json({
        message: "Concern ID, subConcern ID, question, answer, and therapist ID are required.",
        error: true,
      });
    }

    const newFaq = {
      _id: new ObjectId(),
      question: faq.question,
      answer: faq.answer,
      therapistId: faq.therapistId,
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(concernId), "subConcerns._id": new ObjectId(subConcernId) },
      { $push: { "subConcerns.$.faqs": newFaq } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "SubConcern not found.", error: true });
    }

    return res.status(201).json({ message: "FAQ added successfully.", faqId: newFaq._id });
  } catch (error) {
    console.error("Error adding FAQ:", error);
    return res.status(500).json({ message: "Internal Server Error", error: true });
  }
};

const getConcernByRole = async (req, res) => {
  try {
    const db = getDb();
    const concernsCollection = db.collection("concerns");
    const userTypesCollection = db.collection("userTypes");
    const { userType } = req.body;

    const userTypeData = await userTypesCollection.findOne({ _id: new ObjectId(userType) });

    if (!userTypeData) {
      return res.status(404).json({ message: "UserType not found.", error: true });
    }

    const concerns = await concernsCollection.find({ userType: new ObjectId(userType), isActive: true }).toArray();

    return res.status(200).json({
      message: "Concerns retrieved successfully",
      data: {
        userType: {
          id: userTypeData._id,
          name: userTypeData.name
        },
        concerns: concerns
      },
      error: false,
    });
  } catch (error) {
    console.error("Error fetching concerns:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getFaqsByConcernAndSubConcern = async (req, res) => {
  const isValidObjectId = (id) => ObjectId.isValid(id) && String(new ObjectId(id)) === id;
  try {
    const db = getDb();
    const concernCollection = db.collection("concerns");
    const therapistCollection = db.collection("users");

    const { concernIds, subConcernIds } = req.body;

    // Validate input
    if (!Array.isArray(concernIds) || !Array.isArray(subConcernIds)) {
      return res.status(400).json({ 
        message: "Concern IDs and SubConcern IDs must be arrays.", 
        error: true 
      });
    }

    // Filter valid ObjectIds
    const validConcernIds = concernIds.filter(id => isValidObjectId(id)).map(id => new ObjectId(id));
    const validSubConcernIds = subConcernIds.filter(id => isValidObjectId(id));

    if (validConcernIds.length === 0) {
      return res.status(404).json({
        message: "No valid concerns found.",
        faqs: []
      });
    }

    // Fetch concerns from DB
    const concerns = await concernCollection.find({ _id: { $in: validConcernIds } }).toArray();

    let faqs = [];

    // Loop through concerns and their subConcerns
    for (let concern of concerns) {
      if (!concern.subConcerns || concern.subConcerns.length === 0) continue;

      for (let subConcern of concern.subConcerns) {
        if (validSubConcernIds.includes(subConcern._id.toString())) {
          if (!subConcern.faqs || subConcern.faqs.length === 0) continue;

          for (let faq of subConcern.faqs) {
            let therapistDetails = { 
              therapistName: "Unknown", 
              therapistExp: null, 
              therapistImg: "No Image Available" 
            };

            // Check and validate therapist ID
            if (faq.therapistId && isValidObjectId(faq.therapistId)) {
              const therapist = await therapistCollection.findOne(
                { _id: new ObjectId(faq.therapistId) }, 
                { 
                  projection: { 
                    name: 1, 
                    "profile_details.experience": 1, 
                    profile_image: 1 
                  } 
                }
              );

              if (therapist) {
                therapistDetails.therapistName = therapist.name || "Unknown";
                therapistDetails.therapistExp = therapist.profile_details?.experience || null;
                therapistDetails.therapistImg = therapist.profile_image || "No Image Available";
              }
            }

            faqs.push({ ...faq, ...therapistDetails });
          }
        }
      }
    }

    return res.status(200).json({ 
      message: "FAQs retrieved successfully.",
      faqs 
    });
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getFaqsByConcern = async (req, res) => {
  const isValidObjectId = (id) => ObjectId.isValid(id) && String(new ObjectId(id)) === id;

  try {
    const db = getDb();
    const concernCollection = db.collection("concerns");
    const therapistCollection = db.collection("users");

    const { concernIds } = req.body;

    // Validate input
    if (!Array.isArray(concernIds)) {
      return res.status(400).json({ 
        message: "Concern IDs must be an array.", 
        error: true 
      });
    }

    // Filter valid ObjectIds
    const validConcernIds = concernIds.filter(id => isValidObjectId(id)).map(id => new ObjectId(id));

    if (validConcernIds.length === 0) {
      return res.status(404).json({
        message: "No valid concerns found.",
        faqs: []
      });
    }

    // Fetch concerns from DB
    const concerns = await concernCollection.find({ _id: { $in: validConcernIds } }).toArray();

    let faqs = [];

    // Loop through concerns and their subConcerns
    for (let concern of concerns) {
      if (!concern.subConcerns || concern.subConcerns.length === 0) continue;

      for (let subConcern of concern.subConcerns) {
        if (!subConcern.faqs || subConcern.faqs.length === 0) continue;

        for (let faq of subConcern.faqs) {
          let therapistDetails = { 
            therapistName: "", 
            therapistExp: null, 
            therapistImg: "" 
          };

          // Check and validate therapist ID
          if (faq.therapistId && isValidObjectId(faq.therapistId)) {
            const therapist = await therapistCollection.findOne(
              { _id: new ObjectId(faq.therapistId) }, 
              { 
                projection: { 
                  name: 1, 
                  "profile_details.experience": 1, 
                  profile_image: 1 
                } 
              }
            );

            if (therapist) {
              therapistDetails.therapistName = therapist.name;
              therapistDetails.therapistExp = therapist.profile_details?.experience;
              therapistDetails.therapistImg = therapist.profile_image;
            }
          }

          faqs.push({ ...faq, ...therapistDetails });
        }
      }
    }

    return res.status(200).json({ 
      message: "FAQs retrieved successfully.",
      faqs 
    });
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const editConcern = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("concerns");
    const { concernId ,userType, concern, concernImage, concernWaterMark , description } = req.body;

    if (!concernId) {
      return res.status(400).json({
        message: "ConcernId is required.",
        error: true,
      });
    }

    const updateFields = {};
    if (userType) updateFields.userType = new ObjectId(userType);
    if (description) updateFields.description = description;
    if (concern) updateFields.concern = concern;
    if (concernImage) updateFields.concernImage = concernImage;
    if (concernWaterMark) updateFields.concernWaterMark = concernWaterMark;

    const result = await collection.updateOne(
      { _id: new ObjectId(concernId),isActive:true },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Concern not found.", error: true });
    }

    return res.status(200).json({ message: "Concern updated successfully." });
  } catch (error) {
    console.error("Error updating concern:", error);
    return res.status(500).json({ message: "Internal Server Error", error: true });
  }
};

const editSubConcern = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("concerns");
    const { subConcern , concernId, subConcernId } = req.body;

    if (!concernId || !subConcernId || !subConcern) {
      return res.status(400).json({
        message: "Concern ID, subConcernId and subConcern are required.",
        error: true,
      });
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(concernId), isActive:true , "subConcerns._id": new ObjectId(subConcernId) },
      { $set: { "subConcerns.$.subConcern": subConcern } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "SubConcern not found.", error: true });
    }

    return res.status(200).json({ message: "SubConcern updated successfully." });
  } catch (error) {
    console.error("Error updating subConcern:", error);
    return res.status(500).json({ message: "Internal Server Error", error: true });
  }
};

const editFaq = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("concerns");
    const { concernId, subConcernId, faqId, faq } = req.body;

    if (!concernId || !subConcernId || !faqId || !faq || !faq.question || !faq.answer || !faq.therapistId) {
      return res.status(400).json({
        message: "Concern ID, subConcern ID, FAQ ID, question, answer, and therapist ID are required.",
        error: true,
      });
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(concernId), "subConcerns._id": new ObjectId(subConcernId), "subConcerns.faqs._id": new ObjectId(faqId) },
      { 
        $set: { 
          "subConcerns.$[].faqs.$[faq].question": faq.question,
          "subConcerns.$[].faqs.$[faq].answer": faq.answer,
          "subConcerns.$[].faqs.$[faq].therapistId": faq.therapistId,
        } 
      },
      { arrayFilters: [{ "faq._id": new ObjectId(faqId) }] }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "FAQ not found.", error: true });
    }

    return res.status(200).json({ message: "FAQ updated successfully." });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    return res.status(500).json({ message: "Internal Server Error", error: true });
  }
};

const deleteConcern = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("concerns");
    const { concernId } = req.body;

    if (!concernId) {
      return res.status(400).json({
        message: "Concern ID is required.",
        error: true,
      });
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(concernId) },
      { $set: { isActive: false } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Concern not found.", error: true });
    }

    return res.status(200).json({ message: "Concern deleted successfully." });
  } catch (error) {
    console.error("Error deleting concern:", error);
    return res.status(500).json({ message: "Internal Server Error", error: true });
  }
};

const deleteSubConcern = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("concerns");
    const { concernId, subConcernId } = req.body;

    if (!concernId || !subConcernId) {
      return res.status(400).json({
        message: "Concern ID and subConcernId are required.",
        error: true,
      });
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(concernId) },
      { $pull: { subConcerns: { _id: new ObjectId(subConcernId) } } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "SubConcern not found.", error: true });
    }

    return res.status(200).json({ message: "SubConcern deleted successfully." });
  } catch (error) {
    console.error("Error deleting subConcern:", error);
    return res.status(500).json({ message: "Internal Server Error", error: true });
  }
};

const deleteFaq = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("concerns");
    const { concernId, subConcernId, faqId } = req.body;

    if (!concernId || !subConcernId || !faqId) {
      return res.status(400).json({
        message: "Concern ID and subConcern and faqId are required.",
        error: true,
      });
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(concernId), "subConcerns._id": new ObjectId(subConcernId) },
      { $pull: { "subConcerns.$.faqs": { _id: new ObjectId(faqId) } } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "FAQ not found.", error: true });
    }

    return res.status(200).json({ message: "FAQ deleted successfully." });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    return res.status(500).json({ message: "Internal Server Error", error: true });
  }
};

const addUserType = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("userTypes");
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "UserType name is required.", error: true });
    }

    const newUserType = { name, created_at: new Date(),isActive:true };
    const result = await collection.insertOne(newUserType);

    return res.status(201).json({ message: "userType added successfully.", userTypeId: result.insertedId });
  } catch (error) {
    console.error("Error adding userType:", error);
    return res.status(500).json({ message: "Internal Server Error", error: true });
  }
};

const editUserType = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("userTypes");
    const { name , userTypeId } = req.body;

    if (!name) {
      return res.status(400).json({ message: "User Type name is required.", error: true });
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(userTypeId) },
      { $set: { name } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "userType not found.", error: true });
    }

    return res.status(200).json({ message: "userType updated successfully." });
  } catch (error) {
    console.error("Error updating userType:", error);
    return res.status(500).json({ message: "Internal Server Error", error: true });
  }
};

const deleteUserType = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("userTypes");
    const { userTypeId } = req.body;

    const result = await collection.deleteOne({ _id: new ObjectId(userTypeId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "userTypes not found.", error: true });
    }

    return res.status(200).json({ message: "userTypes deleted successfully." });
  } catch (error) {
    console.error("Error deleting userTypes:", error);
    return res.status(500).json({ message: "Internal Server Error", error: true });
  }
};

const geAllUserTypes = async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("userTypes");

    const userType = await collection.find({ isActive: true }).toArray();

    return res.status(200).json({ message: "User types fetched successfully.", userType });
  } catch (error) {
    console.error("Error fetching user types:", error);
    return res.status(500).json({ message: "Internal Server Error", error: true });
  }
};

const AddExpertise = async (req, res) => {
  try {
    const db = getDb();
    const expertiseCollection = db.collection("expertise");

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Expertise name is required.",
        error: true,
      });
    }

    const newExpertise = { name };
    const result = await expertiseCollection.insertOne(newExpertise);

    return res.status(201).json({
      message: "Expertise added successfully.",
      expertiseId: result.insertedId,
    });
  } catch (error) {
    console.error("Error adding expertise:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAllExpertise = async (req, res) => {
  try {
    const db = getDb();
    const expertiseCollection = db.collection("expertise");

    const expertiseList = await expertiseCollection.find().toArray();

    return res.status(200).json({
      message: "Expertise list retrieved successfully.",
      data: expertiseList,
    });
  } catch (error) {
    console.error("Error retrieving expertise:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getExpertiseById = async (req, res) => {
  try {
    const db = getDb();
    const expertiseCollection = db.collection("expertise");

    const { id } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid expertise ID.",
        error: true,
      });
    }

    const expertise = await expertiseCollection.findOne({ _id: new ObjectId(id) });

    if (!expertise) {
      return res.status(404).json({
        message: "Expertise not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Expertise retrieved successfully.",
      data: expertise,
    });
  } catch (error) {
    console.error("Error retrieving expertise:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const updateExpertise = async (req, res) => {
  try {
    const db = getDb();
    const expertiseCollection = db.collection("expertise");
    const { id , name } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid expertise ID.",
        error: true,
      });
    }

    if (!name) {
      return res.status(400).json({
        message: "Expertise name is required.",
        error: true,
      });
    }

    const result = await expertiseCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { name } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Expertise not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Expertise updated successfully.",
    });
  } catch (error) {
    console.error("Error updating expertise:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const deleteExpertise = async (req, res) => {
  try {
    const db = getDb();
    const expertiseCollection = db.collection("expertise");

    const { id } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid expertise ID.",
        error: true,
      });
    }

    const result = await expertiseCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Expertise not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Expertise deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting expertise:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const AddSpecialization = async (req, res) => {
  try {
    const db = getDb();
    const specializationCollection = db.collection("specialization");

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "specialization name is required.",
        error: true,
      });
    }

    const newSpecialization = { name };
    const result = await specializationCollection.insertOne(newSpecialization);

    return res.status(201).json({
      message: "specialization added successfully.",
      specializationId: result.insertedId,
    });
  } catch (error) {
    console.error("Error adding specialization:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAllSpecialization = async (req, res) => {
  try {
    const db = getDb();
    const specializationCollection = db.collection("specialization");

    const specializationList = await specializationCollection.find().toArray();

    return res.status(200).json({
      message: "Specialization list retrieved successfully.",
      data: specializationList,
    });
  } catch (error) {
    console.error("Error retrieving specialization:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getSpecializationById = async (req, res) => {
  try {
    const db = getDb();
    const specializationCollection = db.collection("specialization");

    const { id } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid specialization ID.",
        error: true,
      });
    }

    const specialization = await specializationCollection.findOne({ _id: new ObjectId(id) });

    if (!specialization) {
      return res.status(404).json({
        message: "specialization not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "specialization retrieved successfully.",
      data: specialization,
    });
  } catch (error) {
    console.error("Error retrieving specialization:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const updateSpecialization = async (req, res) => {
  try {
    const db = getDb();
    const specializationCollection = db.collection("specialization");
    const { id , name } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid specialization ID.",
        error: true,
      });
    }

    if (!name) {
      return res.status(400).json({
        message: "specialization name is required.",
        error: true,
      });
    }

    const result = await specializationCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { name } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "specialization not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "specialization updated successfully.",
    });
  } catch (error) {
    console.error("Error updating specialization:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const deleteSpecialization = async (req, res) => {
  try {
    const db = getDb();
    const specializationCollection = db.collection("specialization");

    const { id } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid specialization ID.",
        error: true,
      });
    }

    const result = await specializationCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "specialization not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "specialization deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting specialization:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

module.exports = {
  AddSpecialization,
  getAllSpecialization,
  getSpecializationById,
  updateSpecialization,
  deleteSpecialization,
  AddExpertise,
  getAllExpertise,
  getExpertiseById,
  updateExpertise,
  deleteExpertise,
  getSpeciality,
  getStateList,
  getConcern,
  generateOTPs,
  sendMeetLink,
  getProfileDetail,
  getDashboardCounterByTherapist,
  sendOtpWithSms,
  sendOtpWithEmail,
  validateOTP,
  uploadImage,
  addWalletAmount,
  getWalletDetails,
  userAuthForMobile,
  refreshToken,
  addConcern,
  addSubConcern,
  addFaqs,
  getConcernByRole,
  getFaqsByConcernAndSubConcern,
  editConcern, 
  editSubConcern, 
  editFaq,
  deleteConcern, 
  deleteSubConcern, 
  deleteFaq,
  deleteUserType,
  editUserType,
  addUserType ,
  generateOTP,
  geAllUserTypes,
  getConcernById,
  getSubConcernById,
  getAllConcerns,
  getFaqsByConcern
};
