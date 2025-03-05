const { ObjectId } = require("mongodb");
const { getDb } = require("../db/db");

const sendPreReferral = async (req, res) => {
  try {
    const therapist = req.user ;
    const { clientId, therapistIds, notes } = req.body;

    // Validate inputs
    if (
      !notes ||
      !ObjectId.isValid(clientId) ||
      !Array.isArray(therapistIds) ||
      therapistIds.length === 0
    ) {
      return res.status(400).json({
        message: "Invalid input data.",
        error: true,
      });
    }

    // Validate each therapistId
    const validTherapistIds = therapistIds.every((id) => ObjectId.isValid(id));
    if (!validTherapistIds) {
      return res.status(400).json({
        message: "One or more therapist IDs are invalid.",
        error: true,
      });
    }

    const db = getDb();
    const referralsCollection = db.collection("referrals");

    // Create the referral document
    const referral = {
      client_id: new ObjectId(clientId),
      referrer_id: new ObjectId(therapist._id),
      therapists: therapistIds.map((id) => ({
        therapist_id: new ObjectId(id),
        status: "pending",
        referred_at: new Date(),
      })),
      accepted_by: null, // No therapist has accepted it yet
      created_at: new Date(),
      updated_at: new Date(),
      notes: notes,
      type: "preconsultation"
    };

    // Insert the referral into the database
    const result = await referralsCollection.insertOne(referral);

    if (result.insertedCount === 0) {
      return res.status(500).json({
        message: "Failed to send referral.",
        error: true,
      });
    }

    // Return success response
    return res.status(201).json({
      message: "Referral sent successfully.",
      data: referral,
    });
  } catch (error) {
    console.error("Error sending referral:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const sendSessionReferral = async (req, res) => {
  try {
    const therapist = req.user;
    const { clientId, therapistId, notes } = req.body;

    // Validate inputs
    if (!notes || !ObjectId.isValid(clientId) || !ObjectId.isValid(therapistId)) {
      return res.status(400).json({
        message: "Invalid input data.",
        error: true,
      });
    }

    const db = getDb();
    const referralsCollection = db.collection("referrals");

    // Create the referral document
    const referral = {
      client_id: new ObjectId(clientId),
      referrer_id: new ObjectId(therapist._id),
      therapists: [
        {
          therapist_id: new ObjectId(therapistId),
          status: "pending",
          referred_at: new Date(),
        },
      ],
      accepted_by: null, // No therapist has accepted it yet
      created_at: new Date(),
      updated_at: new Date(),
      notes: notes,
      type: "session"
    };

    // Insert the referral into the database
    const result = await referralsCollection.insertOne(referral);

    if (result.insertedCount === 0) {
      return res.status(500).json({
        message: "Failed to send session referral.",
        error: true,
      });
    }

    // Return success response
    return res.status(201).json({
      message: "Session referral sent successfully.",
      data: referral,
    });
  } catch (error) {
    console.error("Error sending session referral:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const acceptSessionReferral = async (req, res) => {
  try {
    const { referralId } = req.body;
    const therapist = req.user;

    // Validate input
    if (!referralId) {
      return res.status(400).json({
        message: "Missing required field: referralId.",
        error: true,
      });
    }

    if (!ObjectId.isValid(referralId)) {
      return res.status(400).json({
        message: "Invalid referralId.",
        error: true,
      });
    }

    const db = getDb();
    const referralsCollection = db.collection("referrals");
    const usersCollection = db.collection("users");

    // Fetch the referral
    const referral = await referralsCollection.findOne({ _id: new ObjectId(referralId)});

    if (!referral) {
      return res.status(404).json({
        message: "Referral not found.",
        error: true,
      });
    }

    // Check if the therapist has already accepted the referral
    const therapistStatus = referral.therapists.find(t => t.therapist_id.equals(therapist._id));

    if (therapistStatus && therapistStatus.status === "accepted") {
      return res.status(400).json({
        message: "You have already accepted this referral.",
        error: true,
      });
    }

    // Update the therapist's status to accepted
    const result = await referralsCollection.updateOne(
      { _id: new ObjectId(referralId), "therapists.therapist_id": therapist._id },
      {
        $set: {
          "therapists.$.status": "accepted",
          updated_at: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({
        message: "Failed to accept referral.",
        error: true,
      });
    }

    await usersCollection.updateOne(
      { _id: referral.client_id },
      {
        $set: { current_therapist_id: therapist._id },
        $addToSet: { previous_therapists: referral.referrer_id },
      }
    );

    return res.status(200).json({
      message: "Session referral accepted successfully.",
    });
  } catch (error) {
    console.error("Error accepting session referral:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const acceptPreReferral = async (req, res) => {
  try {
      const { referralId } = req.body;

      const therapist = req.user ;

      // Validate input
      if (!referralId || !ObjectId.isValid(referralId)) {
        return res.status(400).json({
          message: "Invalid referralId.",
          error: true,
        });
      }

      const db = getDb();
      const referralsCollection = db.collection("referrals");
      const usersCollection = db.collection("users");

      // Fetch the referral to check the timestamp
      const referral = await referralsCollection.findOne({ _id: new ObjectId(referralId), type:"preconsultation" });

      if (!referral) {
          return res.status(404).json({
              message: "Referral not found.",
              error: true,
          });
      }

      // Check if the referral was sent within the last 24 hours
      const currentTime = new Date();
      const referralTime = new Date(referral.referred_at);
      const timeDifference = currentTime - referralTime;
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (timeDifference > twentyFourHours) {
          return res.status(400).json({
              message: "Referral acceptance period has expired.",
              error: true,
          });
      }

      // Check if the therapist has already accepted the referral
      const therapistStatus = referral.therapists.find(t => t.therapist_id.equals(therapist._id));

      if (therapistStatus && therapistStatus.status === "accepted") {
          return res.status(400).json({
              message: "You have already accepted this referral.",
              error: true,
          });
      }

      // Update the therapist's status to accepted
      const result = await referralsCollection.updateOne(
          { _id: new ObjectId(referralId), "therapists.therapist_id": therapist._id },
          {
              $set: {
                  "therapists.$.status": "accepted",
                  updated_at: currentTime,
              },
          }
      );

      if (result.modifiedCount === 0) {
          return res.status(500).json({
              message: "Failed to accept referral.",
              error: true,
          });
      }

      await usersCollection.updateOne(
        { _id: referral.client_id },
        {
          $set: { current_therapist_id: therapist._id },
          $addToSet: { previous_therapists: referral.referrer_id },
        }
      );

      return res.status(200).json({
          message: "Referral accepted successfully.",
      });
  } catch (error) {
      console.error("Error accepting referral:", error);
      return res.status(500).json({
          message: "Internal Server Error",
          error: error.toString(),
      });
  }
};

const getGivenPreconsultationReferralList = async (req, res) => {
  try {
    const therapist = req.user ;

    if (!therapist) {
      return res.status(400).json({
        message: "Invalid therapist._id.",
        error: true,
      });
    }

    const db = getDb();
    const referralsCollection = db.collection('referrals');
    const userCollection = db.collection('users');

    // Fetch all referrals where the logged-in therapist is the referrer
    const givenReferrals = await referralsCollection.find({
      referrer_id: new ObjectId(therapist._id),
      type: "preconsultation" // Add this condition for type
    }).toArray();    

    if (!givenReferrals.length) {
      return res.status(404).json({
        message: "No given referrals found for this therapist.",
        error: true,
      });
    }

    // Create an array of client IDs to fetch client details in one go
    const clientIds = givenReferrals.map(referral => referral?.client_id);
    
    // Fetch client details for all relevant client IDs
    const clients = await userCollection.find({
      _id: { $in: clientIds.map(id => new ObjectId(id)) }
    }).toArray();

    // Create a map of client ID to client details for easy lookup
    const clientMap = {};
    clients.forEach(client => {
      clientMap[client._id.toString()] = {
        clientName: client.name,
        phoneNumber: client.phone_number
      };
    });

    // For each referral, fetch the therapists who accepted the referral and their details
    const response = await Promise.all(givenReferrals.map(async (referral) => {
      // Fetch the therapists' details for those who accepted the referral
      const therapistIds = referral.therapists.map(therapist => therapist.therapist_id); // Extract therapist IDs
      
      const therapists = await userCollection.find({
        _id: { $in: therapistIds }
      }).toArray();

      // Create a map of therapist ID to therapist details for easy lookup
      const therapistMap = {};
      therapists.forEach(therapist => {
        therapistMap[therapist?._id.toString()] = {
          therapistName: therapist?.name,
          concern: therapist?.concern, // Add other therapist details you want to render
          gender : therapist?.profile_details?.gender,
          specialization : therapist?.profile_details?.specialization
        };
      });

      // Format the response with client details, therapist details, and notes
      return {
        clientId : referral?.client_id ,
        clientName: clientMap[referral?.client_id.toString()]?.clientName || "Unknown",
        phoneNumber: clientMap[referral?.client_id.toString()]?.phoneNumber || "Unknown",
        createdAt: referral?.created_at,
        referredTo: referral?.therapists.map(therapist => ({
          therapistName: therapistMap[therapist?.therapist_id]?.therapistName || "Unknown",
          concern: therapistMap[therapist?.therapist_id]?.concern || "Unknown",
          gender : therapistMap[therapist?.therapist_id]?.gender,
          specialization : therapistMap[therapist?.therapist_id]?.specialization,
          referralStatus: therapist?.status 
        })),
        notes: referral?.notes,
        referralId: referral?._id,
        type: referral?.type
      };
    }));

    return res.status(200).json({
      message: "Given referrals retrieved successfully.",
      data: response,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getReceivedPreconsultationReferralList = async (req, res) => {
  try {
    const therapist = req.user;

    if (!therapist) {
      return res.status(400).json({
        message: "Invalid therapist._id.",
        error: true,
      });
    }

    const db = getDb();
    const referralsCollection = db.collection("referrals");
    const usersCollection = db.collection("users");
    const appointmentsCollection = db.collection("appointments");

    // Fetch all preconsultation referrals where the therapist is in the list
    const receivedReferrals = await referralsCollection.find({
      "therapists.therapist_id": new ObjectId(therapist._id),
      type: "preconsultation",
    }).toArray();

    if (!receivedReferrals.length) {
      return res.status(404).json({
        message: "No received referrals found for this therapist.",
        error: true,
      });
    }

    // Extract client IDs from the referrals
    const clientIds = receivedReferrals.map(referral => referral.client_id);

    // Fetch client details
    const clients = await usersCollection.find({
      _id: { $in: clientIds.map(id => new ObjectId(id)) }
    }).toArray();

    // Create a map of client ID to client details for easy lookup
    const clientMap = {};
    clients.forEach(client => {
      clientMap[client._id.toString()] = {
        clientName: client.name,
        phoneNumber: client.phone_number,
        clientHistory: client.history || "No history available",
      };
    });

    // Fetch appointments related to these referrals
    const appointments = await appointmentsCollection.find({
      user_id: { $in: clientIds.map(id => new ObjectId(id)) },
      therapist_id: new ObjectId(therapist._id),
      type: "preconsultation",
    }).toArray();

    // Create a map of client ID to their appointment details
    const appointmentMap = {};
    appointments.forEach(appointment => {
      appointmentMap[appointment.user_id.toString()] = {
        appointmentId: appointment._id,
        bookingDate: appointment.booking_date,
        bookingSlots: appointment.booking_slots,
        bookingStatus: appointment.booking_status === 1 ? "Assigned" : "Pending",
        amount: appointment.amount,
        paymentStatus: appointment.payment_status === 1 ? "Paid" : "Pending",
      };
    });

    // Format the response with appointment details included
    const response = receivedReferrals.map(referral => {
      const therapistData = referral.therapists.find(t => t.therapist_id.equals(therapist._id));
      const clientDetails = clientMap[referral.client_id.toString()] || {};
      const appointmentDetails = appointmentMap[referral.client_id.toString()] || null;

      return {
        referralId: referral._id,
        clientId: referral.client_id,
        clientName: clientDetails.clientName || "Unknown",
        phoneNumber: clientDetails.phoneNumber || "Unknown",
        clientHistory: clientDetails.clientHistory || "No history available",
        referralStatus: therapistData?.status || "Pending",
        createdAt: referral.created_at,
        notes: referral.notes,
        type: referral.type,
        appointment: appointmentDetails, // Includes appointment info if exists
      };
    });

    return res.status(200).json({
      message: "Received preconsultation referrals retrieved successfully.",
      data: response,
    });
  } catch (error) {
    console.error("Error fetching received preconsultation referrals:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getGivenSessionReferralList = async (req, res) => {
  try {
    const therapist = req.user;

    if (!therapist) {
      return res.status(400).json({
        message: "Invalid therapist._id.",
        error: true,
      });
    }

    const db = getDb();
    const referralsCollection = db.collection("referrals");
    const userCollection = db.collection("users");
    const sessionNotesCollection = db.collection("sessionNotes");

    // Fetch all session referrals where the logged-in therapist is the referrer
    const givenReferrals = await referralsCollection.find({
      referrer_id: new ObjectId(therapist._id),
      type: "session" // Assuming 'type' differentiates session referrals from preconsultation
    }).toArray();

    if (!givenReferrals.length) {
      return res.status(404).json({
        message: "No given session referrals found for this therapist.",
        error: true,
      });
    }

    // Create an array of client IDs to fetch client details in one go
    const clientIds = givenReferrals.map(referral => referral.client_id);

    // Fetch client details for all relevant client IDs
    const clients = await userCollection.find({
      _id: { $in: clientIds.map(id => new ObjectId(id)) }
    }).toArray();

    // Create a map of client ID to client details for easy lookup
    const clientMap = {};
    clients.forEach(client => {
      clientMap[client._id.toString()] = {
        clientName: client?.name,
        phoneNumber: client?.phone_number
      };
    });

    // Fetch session notes for each client
    const sessionNotes = await sessionNotesCollection.find({
      userId: { $in: clientIds.map(id => new ObjectId(id)) }
    }).toArray();

    // Create a map of client ID to session note status
    const sessionNoteMap = {};
    sessionNotes.forEach(note => {
      sessionNoteMap[note.userId.toString()] = note.noteStatus;
    });

    // For each referral, fetch the therapists who accepted the referral and their details
    const response = await Promise.all(givenReferrals.map(async (referral) => {
      // Fetch the therapists' details for those who accepted the referral
      const therapistIds = referral.therapists.map(therapist => therapist.therapist_id); // Extract therapist IDs

      const therapists = await userCollection.find({
        _id: { $in: therapistIds }
      }).toArray();

      // Create a map of therapist ID to therapist details for easy lookup
      const therapistMap = {};
      therapists.forEach(therapist => {
        therapistMap[therapist._id.toString()] = {
          therapistName: therapist?.name,
          concern: therapist?.concern, // Add other therapist details you want to render
          gender: therapist?.profile_details?.gender,
          specialization: therapist?.profile_details?.specialization
        };
      });

      // Format the response with client details, therapist details, referral status, and session note status
      return {
        clientId: referral.client_id,
        clientName: clientMap[referral?.client_id.toString()]?.clientName || "Unknown",
        phoneNumber: clientMap[referral?.client_id.toString()]?.phoneNumber || "Unknown",
        createdAt: referral?.created_at,
        referredTo: referral?.therapists.map(therapist => ({
          therapistName: therapistMap[therapist?.therapist_id]?.therapistName || "Unknown",
          concern: therapistMap[therapist?.therapist_id]?.concern || "Unknown",
          gender: therapistMap[therapist?.therapist_id]?.gender,
          specialization: therapistMap[therapist?.therapist_id]?.specialization,
          referralStatus: therapist?.status
        })),
        sessionNoteStatus: sessionNoteMap[referral?.client_id.toString()] || "Not Sent",
        notes: referral?.notes,
        referralId: referral?._id,
        type: referral?.type
      };
    }));

    return res.status(200).json({
      message: "Given session referrals retrieved successfully.",
      data: response,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getReceivedSessionReferralList = async (req, res) => {
  try {
    const therapist = req.user;
    
    if (!therapist) {
      return res.status(400).json({
        message: "Invalid therapist._id.",
        error: true,
      });
    }

    const db = getDb();
    const referralsCollection = db.collection("referrals");
    const userCollection = db.collection("users");
    const appointmentsCollection = db.collection("appointments");

    // Fetch all session referrals where the logged-in therapist is one of the referred therapists
    const receivedReferrals = await referralsCollection.find({
      "therapists.therapist_id": therapist._id
    }).toArray();
    
    if (!receivedReferrals.length) {
      return res.status(404).json({
        message: "No received session referrals found for this therapist.",
        error: true,
      });
    }

    // Create an array of client IDs to fetch client details in one go
    const clientIds = receivedReferrals.map(referral => referral.client_id);
    console.log("clientID",clientIds);
    
    // Fetch client details for all relevant client IDs
    const clients = await userCollection.find({
      _id: { $in: clientIds.map(id => new ObjectId(id)) }
    }).toArray();
    console.log("clients",clients);
    
    // Create a map of client ID to client details for easy lookup
    const clientMap = {};
    clients.forEach(client => {
      clientMap[client._id.toString()] = {
        clientName: client?.name,
        phoneNumber: client?.phone_number
      };
    });

    // Fetch appointments to determine the consultation status
    const appointments = await appointmentsCollection.find({
      user_id: { $in: clientIds.map(id => new ObjectId(id)) },
      therapist_id: therapist._id
    }).toArray();

    // Create a map of client ID to consultation status
    const consultationMap = {};
    appointments.forEach(appointment => {
      consultationMap[appointment.user_id.toString()] = "Accepted";
    });

    // Default consultation status to 'Pending' for clients without an appointment
    clientIds.forEach(clientId => {
      if (!consultationMap[clientId.toString()]) {
        consultationMap[clientId.toString()] = "Pending";
      }
    });

    // For each referral, fetch the referrer therapist's details and other necessary information
    const response = await Promise.all(receivedReferrals.map(async (referral) => {
      // Fetch the referrer's details
      const referrer = await userCollection.findOne({ _id: new ObjectId(referral.referrer_id) });

      // Find the referral status for the logged-in therapist
      const therapistReferralStatus = referral.therapists.find(
        t => t.therapist_id.equals(therapist._id) // Convert logged-in therapist's _id to ObjectId for comparison
      );

      // Client history can be fetched from your desired source, here we'll assume it's stored in a collection
      const clientHistory = []; // Replace with actual fetching logic if required
     
      // Format the response with client details, referral status, session note status, consultation status, and referrer details
      return {
        clientId: referral.client_id,
        clientName: clientMap[referral?.client_id.toString()]?.clientName || "Unknown",
        phoneNumber: clientMap[referral?.client_id.toString()]?.phoneNumber || "Unknown",
        createdAt: referral?.created_at,
        referredBy: referrer?.name || "Unknown",
        referralStatus: therapistReferralStatus?.status || "Pending",
        consultationStatus: consultationMap[referral?.client_id.toString()],
        clientHistory, // Add actual client history here
        notes: referral?.notes,
        referralId: referral?._id,
        type: referral?.type
      };
    }));

    return res.status(200).json({
      message: "Received session referrals retrieved successfully.",
      data: response,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getListOfTherapistSuggested = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(400).json({
      message: "Invalid user",
      error: true,
    });
  }

  try {
    const db = getDb();
    const referralsCollection = db.collection("referrals");
    const usersCollection = db.collection("users");
    const concernsCollection = db.collection("concerns");
    const expertiseCollection = db.collection("expertise");
    const specializationCollection = db.collection("specialization");

    // Fetch referrals where client_id matches the user ID
    const referrals = await referralsCollection
      .find({ client_id: user._id })
      .toArray();

    // Extract unique therapist IDs where status is 'accepted'
    const therapistIds = [];
    referrals.forEach((referral) => {
      referral.therapists.forEach((therapist) => {
        if (
          therapist.status === "accepted" &&
          !therapistIds.includes(therapist.therapist_id)
        ) {
          therapistIds.push(therapist.therapist_id);
        }
      });
    });

    if (therapistIds.length === 0) {
      return res.status(404).json({
        message: "No accepted therapists found for the user",
        error: true,
      });
    }

    // Fetch therapist details from the users collection
    const therapists = await usersCollection
      .find({
        _id: { $in: therapistIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    // Enrich therapists with concerns, expertise, and specialization
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
      message: "Accepted therapists retrieved successfully",
      data: therapists,
      error: false,
    });

  } catch (error) {
    console.error("Error fetching therapists:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: true,
    });
  }
};



module.exports = { sendPreReferral, acceptPreReferral , getGivenPreconsultationReferralList , getReceivedPreconsultationReferralList , sendSessionReferral , acceptSessionReferral , getGivenSessionReferralList , getReceivedSessionReferralList,getListOfTherapistSuggested};