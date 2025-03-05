const { ObjectId } = require("mongodb");
const { getDb } = require("../db/db");
const { getNextSerialNumber } = require("../utils/serialNumberGenerator");
const { sendTemplatedEmail } = require("../SES/ses");

const getTherapistList = async (req, res) => {
  try {
    const db = getDb();
    const userCollection = db.collection("users");
    const concernsCollection = db.collection("concerns");
    const expertiseCollection = db.collection("expertise");
    const specializationCollection = db.collection("specialization");

    // Get the therapist ID from the logged-in user
    const therapistDetails = req.user;

    // Query to find all therapists except the currently logged-in one
    const therapists = await userCollection
      .find({
        role: "therapist",
        isActive: true,
        _id: { $ne: new ObjectId(therapistDetails._id) }, // Exclude the logged-in therapist
      })
      .project({ password: 0 }) // Exclude the password field from the result
      .toArray();

    if (!therapists || therapists.length === 0) {
      return res.status(404).json({
        message: "No therapists found.",
        error: true,
      });
    }

    for (let therapist of therapists) {
      if (therapist.concerns && therapist.concerns.length > 0) {
        const concernsData = await concernsCollection
          .find({
            _id: { $in: therapist.concerns.map((id) => new ObjectId(id)) },
          })
          .project({ _id: 1, concern: 1 })
          .toArray();
        therapist.concerns = concernsData;
      }

      if (therapist.expertise && therapist.expertise.length > 0) {
        const expertiseData = await expertiseCollection
          .find({
            _id: { $in: therapist.expertise.map((id) => new ObjectId(id)) },
          })
          .project({ _id: 1, name: 1 })
          .toArray();
        therapist.expertise = expertiseData;
      }

      if (therapist.specialization && therapist.specialization.length > 0) {
        const specializationData = await specializationCollection
          .find({
            _id: {
              $in: therapist.specialization.map((id) => new ObjectId(id)),
            },
          })
          .project({ _id: 1, name: 1 })
          .toArray();
        therapist.specialization = specializationData;
      }
    }

    return res.status(200).json({
      message: "Therapists retrieved successfully.",
      data: therapists,
    });
  } catch (error) {
    console.log("Error retrieving therapists:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getTherapistDetail = async (req, res) => {
  try {
    const db = getDb();
    const userCollection = db.collection("users");
    const concernsCollection = db.collection("concerns");
    const expertiseCollection = db.collection("expertise");
    const specializationCollection = db.collection("specialization");

    const { therapistId } = req.params;

    // Validate therapistId
    if (!ObjectId.isValid(therapistId)) {
      return res.status(400).json({
        message: "Invalid therapist ID.",
        error: true,
      });
    }

    // Fetch therapist data (excluding password)
    const therapist = await userCollection.findOne(
      { _id: new ObjectId(therapistId), isActive: true, role: "therapist" },
      { projection: { password: 0 } }
    );

    if (!therapist) {
      return res.status(404).json({
        message: "Therapist not found.",
        error: true,
      });
    }

    // Ensure valid arrays before mapping
    const validObjectIdArray = (arr) =>
      Array.isArray(arr)
        ? arr
            .filter((id) => ObjectId.isValid(id))
            .map((id) => new ObjectId(id))
        : [];

    const concerns = validObjectIdArray(therapist.concerns);
    const expertise = validObjectIdArray(therapist.expertise);
    const specialization = validObjectIdArray(therapist.specialization);

    // Fetch details for concerns, expertise, and specialization
    const concernsData = concerns.length
      ? await concernsCollection
          .find({ _id: { $in: concerns } })
          .project({ _id: 1, concern: 1 })
          .toArray()
      : [];

    const expertiseData = expertise.length
      ? await expertiseCollection
          .find({ _id: { $in: expertise } })
          .project({ _id: 1, name: 1 })
          .toArray()
      : [];

    const specializationData = specialization.length
      ? await specializationCollection
          .find({ _id: { $in: specialization } })
          .project({ _id: 1, name: 1 })
          .toArray()
      : [];

    return res.status(200).json({
      message: "Therapist details retrieved successfully.",
      data: {
        ...therapist,
        concerns: concernsData,
        expertise: expertiseData,
        specialization: specializationData,
      },
    });
  } catch (error) {
    console.error("Error retrieving therapist details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getTherapistSessionSlots = async (req, res) => {
  try {
    const db = getDb();
    const {therapistId} = req.params;
    const userCollection = db.collection("users");
    // Query to find the therapist by Object ID, excluding the password field
    const therapist = await userCollection.findOne(
      {
        _id: new ObjectId(therapistId),
        isActive: true,
        role: "therapist",
      },
      { projection: { slots: 1 } }
    );

    if (!therapist) {
      return res.status(404).json({
        message: "Therapist not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Therapist Slots retrieved successfully.",
      data: therapist,
    });
  } catch (error) {
    console.log("Error retrieving therapist Slots:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getTherapistPreconsultationSlots = async (req, res) => {
  try {
    const db = getDb();
    const {therapistId} = req.params;

    const userCollection = db.collection("users");
    // Query to find the therapist by Object ID, excluding the password field
    const therapist = await userCollection.findOne(
      {
        _id: new ObjectId(therapistId),
        isActive: true,
        role: "therapist",
      },
      { projection: { preconsultation_slots: 1 } }
    );

    if (!therapist) {
      return res.status(404).json({
        message: "Therapist not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Therapist Slots retrieved successfully.",
      data: therapist,
    });
  } catch (error) {
    console.log("Error retrieving therapist Slots:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const addTherapist = async (req, res) => {
  try {
    const db = getDb();
    const userCollection = db.collection("users");

    const {
      name = null,
      phoneNumber = null,
      email = null,
      dob = null,
      gender = null,
      educationQualification = null,
      designation = null,
      specialization = [],
      experience = null,
      concerns = [],
      biography = null,
      organization = null,
      languages = null,
      address = null,
      city = null,
      state = null,
      expertise = [],
      googleMeetLink = null,
      accountHolderName = null,
      accountNumber = null,
      bankName = null,
      branchAddress = null,
      ifscCode = null,
    } = req.body;

    const serialNo = await getNextSerialNumber("user_serial");

    const newTherapist = {
      client_no:serialNo,
      name,
      email,
      phone_number: phoneNumber,
      role: "therapist",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      profile_details: {
        gender,
        dob,
        designation,
        experience,
        languages,
        address,
        city,
        state,
        biography,
        google_meet_link: googleMeetLink,
      },
      educational_qualification: educationQualification,
      concerns,
      expertise,
      specialization,
      organization,
      bank_details: {
        account_holder_name: accountHolderName,
        account_number: accountNumber,
        bank_name: bankName,
        branch_address: branchAddress,
        ifsc_code: ifscCode,
      },
      sessionPricing: {},
      sessionTaken:0,
      minChated:0,
    };

    const result = await userCollection.insertOne(newTherapist);

    const templateData= {
      TherapistName: name,
      TherapistEmail: email,
    };
    sendTemplatedEmail([email],"TherapistRegistered",templateData)

    return res.status(201).json({
      message: "Therapist added successfully.",
      therapistId: result.insertedId,
    });
  } catch (error) {
    console.error("Error adding therapist:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const updateTherapistDetail = async (req, res) => {
  try {
    const db = getDb();
    const userCollection = db.collection("users");
    const concernsCollection = db.collection("concerns");
    const expertiseCollection = db.collection("expertise");
    const specializationCollection = db.collection("specialization");

    const updateData = {};
    const {
      therapistId,
      name,
      phoneNumber,
      email,
      dob,
      gender,
      educationQualification,
      designation,
      specialization,
      experience,
      concerns,
      biography,
      organization,
      languages,
      address,
      city,
      state,
      expertise,
      googleMeetLink,
      accountHolderName,
      accountNumber,
      bankName,
      branchAddress,
      ifscCode,
    } = req.body;

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phone_number = phoneNumber;
    if (organization) updateData.organization = organization;
    if (expertise) updateData.expertise = expertise;
    if (concerns) updateData.concerns = concerns;
    if (specialization) updateData.specialization = specialization;
    if (educationQualification) updateData.educational_qualification = educationQualification;

    if (googleMeetLink) updateData["profile_details.google_meet_link"] = googleMeetLink;
    if (gender) updateData["profile_details.gender"] = gender;
    if (dob) updateData["profile_details.dob"] = dob;
    if (designation) updateData["profile_details.designation"] = designation;
    if (experience) updateData["profile_details.experience"] = experience;
    if (biography) updateData["profile_details.biography"] = biography;
    if (languages) updateData["profile_details.languages"] = languages;
    if (address) updateData["profile_details.address"] = address;
    if (city) updateData["profile_details.city"] = city;
    if (state) updateData["profile_details.state"] = state;

    if (accountHolderName) updateData["bank_details.account_holder_name"] = accountHolderName;
    if (accountNumber) updateData["bank_details.account_number"] = accountNumber;
    if (bankName) updateData["bank_details.bank_name"] = bankName;
    if (branchAddress) updateData["bank_details.branch_address"] = branchAddress;
    if (ifscCode) updateData["bank_details.ifsc_code"] = ifscCode;

    // Update only provided fields
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update.",
        error: true,
      });
    }

    updateData.updatedAt = new Date();

    const result = await userCollection.updateOne(
      { _id: new ObjectId(therapistId), role: "therapist",isActive:true },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Therapist not found or update data is invalid.",
        error: true,
      });
    }

    // Fetch the updated therapist details
    const updatedTherapist = await userCollection.findOne(
      { _id: new ObjectId(therapistId), role: "therapist",isActive:true },
      { projection: { password: 0 } }
    );

    if (updatedTherapist.concerns && updatedTherapist.concerns.length > 0) {
      const concernsData = await concernsCollection
        .find({ _id: { $in: updatedTherapist.concerns.map(id => new ObjectId(id)) } })
        .project({ _id: 1, concern: 1 })
        .toArray();
      updatedTherapist.concerns = concernsData;
    }

    if (updatedTherapist.expertise && updatedTherapist.expertise.length > 0) {
      const expertiseData = await expertiseCollection
        .find({ _id: { $in: updatedTherapist.expertise.map(id => new ObjectId(id)) } })
        .project({ _id: 1, name: 1 })
        .toArray();
      updatedTherapist.expertise = expertiseData;
    }

    if (updatedTherapist.specialization && updatedTherapist.specialization.length > 0) {
      const specializationData = await specializationCollection
        .find({ _id: { $in: updatedTherapist.specialization.map(id => new ObjectId(id)) } })
        .project({ _id: 1, name: 1 })
        .toArray();
      updatedTherapist.specialization = specializationData;
    }

    return res.status(200).json({
      message: "Therapist details updated successfully.",
      data: updatedTherapist,
    });
  } catch (error) {
    console.error("Error updating therapist details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getMonthlyAppointmentData = async (req, res) => {
  try {
    const db = getDb();

    const therapistId = req.user._id;

    // Aggregating appointments by month and type
    const aggregationPipeline = [
      {
        // Step 1: Add a new field to extract the month and year from the booking_date
        $addFields: {
          bookingMonth: { $month: "$booking_date" },
          bookingYear: { $year: "$booking_date" },
        },
      },
      {
        // Step 2: Match only appointments for the current year
        $match: {
          bookingYear: new Date().getFullYear(),
          therapist_id: therapistId, // Ensure the therapist's appointments are matched
        },
      },
      {
        // Step 3: Group by the month and appointment type
        $group: {
          _id: {
            month: "$bookingMonth",
            type: "$type", // Either "preconsultation" or "session"
          },
          count: { $sum: 1 },
        },
      },
      {
        // Step 4: Project the result to make it more readable
        $project: {
          _id: 0,
          month: "$_id.month",
          type: "$_id.type",
          count: 1,
        },
      },
      {
        // Sort by month
        $sort: { month: 1 },
      },
    ];

    // Execute aggregation pipeline on the appointments collection
    const appointmentData = await db
      .collection("appointments")
      .aggregate(aggregationPipeline)
      .toArray();

    // Initialize monthly data structure
    const monthlyData = [
      { month: "Jan", appointment: 0, preconsultation: 0 },
      { month: "Feb", appointment: 0, preconsultation: 0 },
      { month: "Mar", appointment: 0, preconsultation: 0 },
      { month: "Apr", appointment: 0, preconsultation: 0 },
      { month: "May", appointment: 0, preconsultation: 0 },
      { month: "Jun", appointment: 0, preconsultation: 0 },
      { month: "Jul", appointment: 0, preconsultation: 0 },
      { month: "Aug", appointment: 0, preconsultation: 0 },
      { month: "Sep", appointment: 0, preconsultation: 0 },
      { month: "Oct", appointment: 0, preconsultation: 0 },
      { month: "Nov", appointment: 0, preconsultation: 0 },
      { month: "Dec", appointment: 0, preconsultation: 0 },
    ];

    // Populate the response with the aggregated data
    appointmentData.forEach(({ month, type, count }) => {
      const index = month - 1;
      if (type === "session") {
        monthlyData[index].appointment = count;
      } else if (type === "preconsultation") {
        monthlyData[index].preconsultation = count;
      }
    });

    return res.status(200).json({
      message: "Monthly appointment data retrieved successfully",
      data: monthlyData,
    });
  } catch (error) {
    console.error("Error retrieving monthly appointment data:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getEarningsAndCounts = async (req, res) => {
  try {
    const db = getDb();
    const appointmentsCollection = db.collection("appointments");
    const paymentsCollection = db.collection("payments"); // New payments collection
    const usersCollection = db.collection("users");
    const therapistId = req.user._id;

    const { startDate, endDate } = req.body;

    if (!therapistId) {
      return res.status(400).json({
        message: "Therapist ID is missing",
        error: true,
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Start date and end date are required",
        error: true,
      });
    }

    // Convert dates to ISO format if they're not already
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Ensure endDate is inclusive
    end.setHours(23, 59, 59, 999);

    // Fetch therapist's receivedAmount and dueAmount from users collection
    const therapist = await usersCollection.findOne(
      { _id: new ObjectId(therapistId) },
      { projection: { receivedAmount: 1, dueAmount: 1 } }
    );

    if (!therapist) {
      return res.status(404).json({
        message: "Therapist not found",
        error: true,
      });
    }

    const { receivedAmount, dueAmount } = therapist;

    // Fetch total earnings from payments collection (simple query)
    const payments = await paymentsCollection
      .find({
        therapist_id: therapistId,
        date: { $gte: start, $lte: end }, // Filter by date range
      })
      .toArray();

    const totalEarnings = payments.reduce((sum, payment) => sum + payment.amount, 0);

    // Fetch all appointments for this therapist and date range
    const appointments = await appointmentsCollection
      .find({
        therapist_id: therapistId,
        booking_date: { $gte: start, $lte: end }, // Filter by date range
      })
      .toArray();

    // Calculate the counts manually
    let appointmentsCount = 0;
    let preconsultationsCount = 0;
    let liveChatCount = 0;

    appointments.forEach((appointment) => {
      if (appointment.type === "session") {
        appointmentsCount++;
      } else if (appointment.type === "preconsultation") {
        preconsultationsCount++;
      } else if (appointment.type === "live_chat") {
        liveChatCount++;
      }
    });

    return res.status(200).json({
      totalEarnings,
      receivedAmount: receivedAmount || 0,
      dueAmount: dueAmount || 0,
      appointmentsCount,
      preconsultationsCount,
      liveChatCount,
    });
  } catch (error) {
    console.log("Error fetching earnings and counts:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAppointmentEarningsByType = async (req, res) => {
  try {
    const db = getDb();
    const paymentsCollection = db.collection("payments");
    const therapistId = req.user._id;

    if (!therapistId) {
      return res.status(400).json({
        message: "Therapist ID is missing",
        error: true,
      });
    }

    const currentYear = new Date().getFullYear();
    const startOfYearString = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const endOfYearString = new Date(`${currentYear}-12-31T23:59:59.999Z`);

    // Fetch all payments for this therapist within the current year
    const payments = await paymentsCollection
      .find({
        therapist_id: therapistId,
        date: { $gte: startOfYearString, $lte: endOfYearString },
      })
      .toArray();

    // Initialize earnings counters for each type
    let totalAppointmentEarning = 0;
    let totalPreConsultationEarning = 0;
    let totalGroupSessionsEarning = 0;
    let totalLiveChatEarning = 0;

    // Iterate over payments and sum up the amounts based on the type
    payments.forEach((payment) => {
      switch (payment.type) {
        case "post":
          totalAppointmentEarning += payment.amount;
          break;
        case "pre":
          totalPreConsultationEarning += payment.amount;
          break;
        case "group":
          totalGroupSessionsEarning += payment.amount;
          break;
        case "live":
          totalLiveChatEarning += payment.amount;
          break;
        default:
          break;
      }
    });

    return res.status(200).json({
      year: currentYear,
      totalAppointmentEarning,
      totalPreConsultationEarning,
      totalGroupSessionsEarning,
      totalLiveChatEarning,
    });
  } catch (error) {
    console.log("Error fetching earnings by type:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAppoitnmentEarningpermonth = async (req, res) => {
  try {
    const db = getDb();
    const therapistId = req.user._id;

    if (!therapistId) {
      return res.status(400).json({
        message: "Therapist ID is missing",
        error: true,
      });
    }

    const Payments = db.collection("payments");

    // Fetch total appointment count for the therapist
    const totalAppointment = await db
      .collection("appointments")
      .countDocuments({ therapist_id: therapistId });

    const aggregationPipeline = [
      {
        // Step 1: Add a new field to extract the month and year from the booking_date
        $addFields: {
          bookingMonth: { $month: "$booking_date" },
          bookingYear: { $year: "$booking_date" },
        },
      },
      {
        // Step 2: Match only appointments for the current year
        $match: {
          bookingYear: new Date().getFullYear(),
          therapist_id: therapistId, // Ensure the therapist's appointments are matched
        },
      },
      {
        // Step 3: Group by the month and appointment type
        $group: {
          _id: {
            month: "$bookingMonth",
            type: "$type", // Either "preconsultation" or "session"
          },
          count: { $sum: 1 },
        },
      },
      {
        // Step 4: Project the result to make it more readable
        $project: {
          _id: 0,
          month: "$_id.month",
          type: "$_id.type",
          count: 1,
        },
      },
      {
        // Sort by month
        $sort: { month: 1 },
      },
    ];

    // Execute aggregation pipeline on the appointments collection
    const appointmentData = await db
      .collection("appointments")
      .aggregate(aggregationPipeline)
      .toArray();

    // Initialize monthly data structure
    const monthlyData = [
      { month: "Jan", appointment: 0, preconsultation: 0 },
      { month: "Feb", appointment: 0, preconsultation: 0 },
      { month: "Mar", appointment: 0, preconsultation: 0 },
      { month: "Apr", appointment: 0, preconsultation: 0 },
      { month: "May", appointment: 0, preconsultation: 0 },
      { month: "Jun", appointment: 0, preconsultation: 0 },
      { month: "Jul", appointment: 0, preconsultation: 0 },
      { month: "Aug", appointment: 0, preconsultation: 0 },
      { month: "Sep", appointment: 0, preconsultation: 0 },
      { month: "Oct", appointment: 0, preconsultation: 0 },
      { month: "Nov", appointment: 0, preconsultation: 0 },
      { month: "Dec", appointment: 0, preconsultation: 0 },
    ];

    // Populate the response with the aggregated data
    appointmentData.forEach(({ month, type, count }) => {
      const index = month - 1;
      if (type === "session") {
        monthlyData[index].appointment = count;
      } else if (type === "preconsultation") {
        monthlyData[index].preconsultation = count;
      }
    });

    // Filter payments only for the current year
    const currentYear = new Date().getFullYear();
    let overallTotalEarning = 0;
    const payments = await Payments.find({
      therapist_id: therapistId,
      type: { $in: ["pre", "post"] },
      date: {
        $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        $lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`),
      },
    }).toArray();

    // Calculate total earnings for the current year
    payments.forEach((payment) => {
      overallTotalEarning += payment.amount;
    });

    res.status(200).json({
      monthlyData,
      overallTotalEarning,
      totalAppointment,
    });
  } catch (error) {
    console.error("Error in getAppoitnmentEaringpermonth:", error);
    return res.status(500).json({
      message: "Error fetching payments",
      error: true,
    });
  }
};

const addSessionPricing = async (req, res) => {
  try {
    const db = getDb();
    const therapistCollection = db.collection("users");

    const { id ,in_person, audio, video, chat , preconsultation } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid therapist ID.", error: true });
    }

    if (!in_person || !audio || !video || !chat || !preconsultation) {
      return res.status(400).json({ message: "All session pricing types are required.", error: true });
    }

    const newPricing = { sessionPricing: { in_person, audio, video, chat , preconsultation } };

    const result = await therapistCollection.updateOne(
      { _id: new ObjectId(id), role: "therapist",isActive:true },
      { $set: newPricing }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Therapist not found.", error: true });
    }

    return res.status(201).json({ message: "Session pricing added successfully." });
  } catch (error) {
    console.error("Error adding session pricing:", error);
    return res.status(500).json({ message: "Internal Server Error", error: true });
  }
};

const getSessionPricing = async (req, res) => {
  try {
    const db = getDb();
    const therapistCollection = db.collection("users");

    const { id } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid therapist ID.", error: true });
    }

    const therapist = await therapistCollection.findOne(
      { _id: new ObjectId(id), role: "therapist",isActive:true },
      { projection: { sessionPricing: 1 } }
    );

    if (!therapist || !therapist.sessionPricing) {
      return res.status(404).json({ message: "Session pricing not found.", error: true });
    }

    return res.status(200).json({ message: "Session pricing retrieved successfully.", data: therapist.sessionPricing });
  } catch (error) {
    console.error("Error retrieving session pricing:", error);
    return res.status(500).json({ message: "Internal Server Error", error: true });
  }
};

const updateSessionPricing = async (req, res) => {
  try {
    const db = getDb();
    const therapistCollection = db.collection("users");

    const { id , in_person, audio, video, chat , preconsultation} = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid therapist ID.", error: true });
    }

    const updateData = {};
    if (in_person) updateData["sessionPricing.in_person"] = in_person;
    if (audio) updateData["sessionPricing.audio"] = audio;
    if (video) updateData["sessionPricing.video"] = video;
    if (chat) updateData["sessionPricing.chat"] = chat;
    if (preconsultation) updateData["sessionPricing.preconsultation"] = preconsultation;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No valid pricing fields provided for update.", error: true });
    }

    const result = await therapistCollection.updateOne(
      { _id: new ObjectId(id), role: "therapist",isActive:true },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Therapist not found.", error: true });
    }

    return res.status(200).json({ message: "Session pricing updated successfully." });
  } catch (error) {
    console.error("Error updating session pricing:", error);
    return res.status(500).json({ message: "Internal Server Error", error: true });
  }
};

const deleteSessionPricing = async (req, res) => {
  try {
    const db = getDb();
    const therapistCollection = db.collection("users");

    const { id } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid therapist ID.", error: true });
    }

    const result = await therapistCollection.updateOne(
      { _id: new ObjectId(id), role: "therapist",isActive:true },
      { $unset: { sessionPricing: "" } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Therapist not found.", error: true });
    }

    return res.status(200).json({ message: "Session pricing deleted successfully." });
  } catch (error) {
    console.error("Error deleting session pricing:", error);
    return res.status(500).json({ message: "Internal Server Error", error: true });
  }
};

const removeTherapist = async (req, res) => {
  try {
    const db = getDb();
    const userCollection = db.collection("users");

    const { therapistId } = req.params;

    // Validate therapistId
    if (!ObjectId.isValid(therapistId)) {
      return res.status(400).json({
        message: "Invalid therapist ID.",
        error: true,
      });
    }

    // Update therapist's isActive status to false
    const result = await userCollection.updateOne(
      { _id: new ObjectId(therapistId), role: "therapist",isActive:true },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Therapist not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Therapist removed successfully.",
    });
  } catch (error) {
    console.error("Error removing therapist:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getEarningsByTherapist = async (req, res) => {
  try {
    const db = getDb();
    const paymentsCollection = db.collection("payments");
    const usersCollection = db.collection("users");
    const {therapistId} = req.body;

    // const { startDate, endDate } = req.body;

    if (!therapistId) {
      return res.status(400).json({
        message: "Therapist ID is missing",
        error: true,
      });
    }

    // if (!startDate || !endDate) {
    //   return res.status(400).json({
    //     message: "Start date and end date are required",
    //     error: true,
    //   });
    // }

    // const start = new Date(startDate);
    // const end = new Date(endDate);
    // end.setHours(23, 59, 59, 999); // Make endDate inclusive

    // Fetch therapist's receivedAmount and dueAmount
    const therapist = await usersCollection.findOne(
      { _id: new ObjectId(therapistId) },
      { projection: { receivedAmount: 1, dueAmount: 1 } }
    );

    if (!therapist) {
      return res.status(404).json({
        message: "Therapist not found",
        error: true,
      });
    }

    const { receivedAmount, dueAmount } = therapist;

    // Fetch all payments related to this therapist
    const payments = await paymentsCollection
      .find({
        therapist_id: new ObjectId(therapistId)
        // date: { $gte: start, $lte: end },
      })
      .toArray();

    let totalEarnings = 0;
    let sessionEarnings = 0;
    let preconsultationEarnings = 0;
    let liveChatEarnings = 0;
    let groupSessionEarnings = 0;

    payments.forEach((payment) => {
      console.log("qwert",payment);
      
      const earnings = payment.amount || 0;
      totalEarnings += earnings;

      if (payment.type === "post") {
        sessionEarnings += earnings;
      } else if (payment.type === "pre") {
        preconsultationEarnings += earnings;
      } else if (payment.type === "live_chat") {
        liveChatEarnings += earnings;
      } else if (payment.type === "group") {
        groupSessionEarnings += earnings;
      }
    });

    return res.status(200).json({ message: "Session pricing retrieved successfully.", data: {
      totalEarnings,
      receivedAmount: receivedAmount || 0,
      dueAmount: dueAmount || 0,
      sessionEarnings,
      preconsultationEarnings,
      liveChatEarnings,
      groupSessionEarnings,
    } });
  } catch (error) {
    console.log("Error fetching earnings:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAllAppointmentDataPerMonth = async (req, res) => {
  try {
    const db = getDb();
    const therapistId = req.user._id;
    const currentYear = new Date().getFullYear();

    // Define start and end dates for the current year
    const startOfYear = new Date(`${currentYear}-01-01T00:00:00Z`);
    const startOfNextYear = new Date(`${currentYear + 1}-01-01T00:00:00Z`);

    // Fetch appointments for the current therapist, within the current year,
    // and only for booking_status 1 (completed) or 5 (cancelled)
    const appointments = await db.collection("appointments").find({
      therapist_id: therapistId,
      booking_status: { $in: [1, 5] },
      booking_date: { $gte: startOfYear, $lt: startOfNextYear },
    }).toArray();

    // Initialize the monthly data array with keys for completed and cancelled counts
    const monthlyData = [
      { month: "Jan", completed: 0, cancelled: 0 },
      { month: "Feb", completed: 0, cancelled: 0 },
      { month: "Mar", completed: 0, cancelled: 0 },
      { month: "Apr", completed: 0, cancelled: 0 },
      { month: "May", completed: 0, cancelled: 0 },
      { month: "Jun", completed: 0, cancelled: 0 },
      { month: "Jul", completed: 0, cancelled: 0 },
      { month: "Aug", completed: 0, cancelled: 0 },
      { month: "Sep", completed: 0, cancelled: 0 },
      { month: "Oct", completed: 0, cancelled: 0 },
      { month: "Nov", completed: 0, cancelled: 0 },
      { month: "Dec", completed: 0, cancelled: 0 },
    ];

    // Track total earnings, total completed, and total cancelled
    let totalEarnings = 0;
    let totalCompleted = 0;
    let totalCancelled = 0;

    // Loop through each appointment to update counts
    appointments.forEach((appointment) => {
      const bookingDate = new Date(appointment.booking_date);
      const monthIndex = bookingDate.getMonth(); // 0 for January, 11 for December

      if (appointment.booking_status === 1) {
        // Completed
        monthlyData[monthIndex].completed += 1;
        totalCompleted += 1;
        // Add to earnings if only completed appointments count toward earnings
        totalEarnings += appointment.amount || 0;
      } else if (appointment.booking_status === 5) {
        // Cancelled
        monthlyData[monthIndex].cancelled += 1;
        totalCancelled += 1;
      }
    });

    return res.status(200).json({
      message: "Monthly appointment data retrieved successfully",
      data: monthlyData,         // Monthly breakdown
      totalEarnings,             // e.g., 1000
      totalCompleted,            // e.g., 55
      totalCancelled,            // e.g., 10
    });
  } catch (error) {
    console.error("Error retrieving monthly appointment data:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAllLiveChatDataPerMonth = async (req, res) => {
  try {
    const db = getDb();
    const therapistId = req.user._id;
    const currentYear = new Date().getFullYear();

    // Define start and end dates for the current year
    const startOfYear = new Date(`${currentYear}-01-01T00:00:00Z`);
    const startOfNextYear = new Date(`${currentYear + 1}-01-01T00:00:00Z`);

    // Fetch live chats for the therapist within the current year
    const liveChats = await db.collection("live_chats").find({
      therapistId: therapistId,
      createdAt: { $gte: startOfYear, $lt: startOfNextYear },
    }).toArray();

    // Initialize the monthly data structure
    const monthlyData = [
      { month: "Jan", sessions: 0, totalDuration: 0, earnings: 0 },
      { month: "Feb", sessions: 0, totalDuration: 0, earnings: 0 },
      { month: "Mar", sessions: 0, totalDuration: 0, earnings: 0 },
      { month: "Apr", sessions: 0, totalDuration: 0, earnings: 0 },
      { month: "May", sessions: 0, totalDuration: 0, earnings: 0 },
      { month: "Jun", sessions: 0, totalDuration: 0, earnings: 0 },
      { month: "Jul", sessions: 0, totalDuration: 0, earnings: 0 },
      { month: "Aug", sessions: 0, totalDuration: 0, earnings: 0 },
      { month: "Sep", sessions: 0, totalDuration: 0, earnings: 0 },
      { month: "Oct", sessions: 0, totalDuration: 0, earnings: 0 },
      { month: "Nov", sessions: 0, totalDuration: 0, earnings: 0 },
      { month: "Dec", sessions: 0, totalDuration: 0, earnings: 0 },
    ];

    // Track total earnings and session counts
    let totalEarnings = 0;
    let totalSessions = 0;
    let totalDuration = 0;

    // Process each live chat session
    liveChats.forEach((chat) => {
      const chatDate = new Date(chat.createdAt);
      const monthIndex = chatDate.getMonth(); // 0 for January, 11 for December

      monthlyData[monthIndex].sessions += 1;
      totalSessions += 1;
      if (chat.duration) {
        monthlyData[monthIndex].totalDuration += chat.duration;
        totalDuration += chat.duration;
      }
      if (chat.price) {
        monthlyData[monthIndex].earnings += chat.price;
        totalEarnings += chat.price;
      }
    });

    return res.status(200).json({
      message: "Monthly live chat data retrieved successfully",
      data: monthlyData,       // Monthly breakdown
      totalEarnings,           // e.g., 5000
      totalSessions,           // e.g., 120
      totalDuration,           // e.g., 3600 minutes
    });
  } catch (error) {
    console.error("Error retrieving monthly live chat data:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};


module.exports = {
  addTherapist,
  getTherapistList,
  getTherapistDetail,
  updateTherapistDetail,
  getTherapistSessionSlots,
  getTherapistPreconsultationSlots,
  getMonthlyAppointmentData,
  getEarningsAndCounts,
  getAppointmentEarningsByType,
  getAppoitnmentEarningpermonth,
  addSessionPricing,
  getSessionPricing,
  updateSessionPricing,
  deleteSessionPricing,
  removeTherapist,
  getEarningsByTherapist,
  getAllAppointmentDataPerMonth,
  getAllLiveChatDataPerMonth
};
