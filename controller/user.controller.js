const { ObjectId } = require("mongodb");
const { getDb } = require("../db/db");
const moment = require("moment");
const {sendTemplatedEmail} = require('../SES/ses.js');
const { use } = require("express/lib/application.js");
const { getNextSerialNumber } = require("../utils/serialNumberGenerator");
const { generateWalletId } = require("../helpers/getConversation.js");

const userDetails = async (req, res) => {
  try {
    const user = req.user;

    return res.status(200).json({
      message: "User details",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
    });
  }
};

const addUser = async (req, res) => {
  try {
    const db = getDb();
    const usersCollection = db.collection("users");

    const { name, gender, emailId, phoneNumber, age, address, city, therapistId } = req.body;

    if (!name || !gender || !emailId || !phoneNumber || !age || !address || !city) {
      return res.status(400).json({
        message: "All fields including therapistId are required.",
        error: true,
      });
    }

    let assignedTherapist = null;

    if (therapistId) {
      if (!ObjectId.isValid(therapistId)) {
        return res.status(400).json({
          message: "Invalid therapistId format.",
          error: true,
        });
      }

      const therapist = await usersCollection.findOne({
        _id: new ObjectId(therapistId),
        role: "therapist",
        isActive: true,
      });

      if (!therapist) {
        return res.status(400).json({
          message: "Invalid therapistId. Therapist not found or inactive.",
          error: true,
        });
      }

      assignedTherapist = new ObjectId(therapistId);
    }

    const serialNo = await getNextSerialNumber("user_serial");

    const newUser = {
      client_no: serialNo,
      name: name,
      email: emailId,
      phone_number: phoneNumber,
      role: "user",
      profile_details: {
        gender: gender,
        age: age,
        address: `${address}, ${city}`,
      },
      isActive: true,
      created_at: new Date().toISOString(),
      referred_by: "Enso Product",
      current_therapist_id: assignedTherapist,
      previous_therapists: [],
    };

    const result = await usersCollection.insertOne(newUser);

    const insertedUser = await usersCollection.findOne(
      { _id: result.insertedId },
      { projection: { password: 0 } }
    );

    const templateData= {
      TherapistName: name,
      TherapistEmail: emailId,
    };
    sendTemplatedEmail([emailId],"TherapistRegistered",templateData)

    return res.status(201).json({
      message: "User added successfully with assigned therapist.",
      user: insertedUser,
    });
  } catch (error) {
    console.error("Error adding user:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const editUser = async (req, res) => {
  try {
    const db = getDb();
    const userCollection = db.collection("users");

    const { userId, name, phoneNumber, email, dateOfBirth, gender, address } =
      req.body;

    const updateData = {
      name,
      email,
      phone_number: phoneNumber,
      "profile_details.gender": gender,
      "profile_details.address": address,
      "profile_details.dob": dateOfBirth,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    // Perform the update operation
    const result = await userCollection.updateOne(
      { _id: new ObjectId(userId), role:"user" ,isActive:true },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "User not found or update data is invalid.",
        error: true,
      });
    }

    // Fetch the updated User details
    const updatedUser = await userCollection.findOne(
      { _id: new ObjectId(userId), role:"user" ,isActive:true },
      { projection: { password: 0 } }
    );

    return res.status(200).json({
      message: "User details updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    console.log("Error updating User details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAllTherapistUsers = async (req, res) => {
  try {
    const db = getDb();
    const therapistDetails = req.user; // Assuming therapist_id is obtained from req.user
    const { type } = req.params; // Type of appointment, e.g., 'session', 'preconsultation'

    // Fetch appointments matching therapistId and type
    const appointments = await db
      .collection("appointments")
      .find({
        therapist_id: therapistDetails?._id,
        type: type,
      })
      .toArray();

    if (!appointments || appointments.length === 0) {
      return res.status(404).json({
        message: "No appointments found.",
        data: [],
      });
    }

    // Extract unique user_ids
    const uniqueUserIds = [
      ...new Set(appointments.map((app) => app.user_id.toString())),
    ];

    // Fetch user details for each unique user_id
    const users = await db
      .collection("users")
      .find({
        _id: { $in: uniqueUserIds.map((id) => new ObjectId(id)) }
        , role:"user" ,isActive:true
      })
      .toArray();

    return res.status(200).json({
      message: "Unique users retrieved successfully.",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getAllUsersByTherapist = async (req, res) => {
  try {
    const db = getDb();
    const therapistDetails = req.user;

    const usersCollection = db.collection("users");
    const users = await usersCollection.find({
      $or: [
        { current_therapist_id: new ObjectId(therapistDetails._id) }, // Current clients
        { previous_therapists: new ObjectId(therapistDetails._id) }, // Old clients
      ],
      role: "user",
      isActive: true,
    }).toArray();

    return res.status(200).json({
      message: "Clients retrieved successfully.",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const db = getDb();
    const concernsCollection = db.collection("concerns");
    const userTypesCollection = db.collection("userTypes");
    
    const {userId} = req.params; // Extract user ID from request parameters

    // Validate the ObjectId
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid user ID format.",
      });
    }

    // Fetch user details from the database
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId), role:"user" ,isActive:true },
      {
        projection: { appointments: 0, clientHistory: 0 },
      }
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    let concernsWithTitle = [];
    let subConcernsWithTitle = [];

    // Fetch concern names
    if (user?.concerns && user.concerns.length > 0) {
      concernsWithTitle = await concernsCollection
        .find({ _id: { $in: user.concerns.map(id => new ObjectId(id)) } })
        .project({ _id: 1, concern: 1 })
        .toArray();
    }

    if(user?.userType){
      const userType = await userTypesCollection.findOne({ _id: new ObjectId(user.userType) });
      user.userType = userType
    }

    // Fetch sub-concern names
    if (user?.subConcerns && user.subConcerns.length > 0) {
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

    // Attach concerns and sub-concerns names to the user object
    user.concerns = concernsWithTitle;
    user.subConcerns = subConcernsWithTitle;
    user.userType = user.userType || {};

    return res.status(200).json({
      message: "User details retrieved successfully.",
      data: user,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getClientHistory = async (req, res) => {
  try {
    const db = getDb();
    const {userId} = req.params; // Get the user ID from the URL parameter

    // Validate the ObjectId
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid user ID format.",
      });
    }

    // Fetch only the clientHistory from the user's details
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId), role:"user" ,isActive:true },
      { projection: { clientHistory: 1 } } // Exclude all other fields except clientHistory
    );

    if (!user || !user.clientHistory) {
      return res.status(404).json({
        message: "Client history not found.",
      });
    }

    return res.status(200).json({
      message: "Client history retrieved successfully.",
      data: user.clientHistory,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getUserDetailsByEmail = async (req, res) => {
  try {
    const db = getDb();
    const { emailId } = req.body; // Get the user ID from the URL parameter

    // Validate the ObjectId
    if (!emailId) {
      return res.status(400).json({
        message: "Email Id is required",
      });
    }

    // Fetch user details from the database
    const user = await db
      .collection("users")
      .findOne({ email: emailId }, { projection: { password: 0 } });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "User details retrieved successfully.",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const addClientHistory = async (req, res) => {
  try {
    const db = getDb();

    const {
      userId,
      name,
      age,
      dateOfIntake,
      familyCurrentSituation,
      familyHistory,
      presentingProblem,
      pertinentHistory,
      tentativeGoalsAndPlans,
      observations,
      specialNeeds,
      diagnostic,
      riskBehaviors,
      appearance,
      speech,
      thoughtProcessContent,
      appetite,
      behavior,
      orientation,
      affect,
      mood,
      judgement,
      sleep,
      concern,
      imageUrl,
      importantNotes,
    } = req.body;

    if (!userId && !name && !age && !dateOfIntake) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    // Check if at least one set of fields is present
    const hasFirstSet = [
      familyCurrentSituation,
      familyHistory,
      presentingProblem,
      pertinentHistory,
      tentativeGoalsAndPlans,
      observations,
      specialNeeds,
      diagnostic,
      riskBehaviors,
      appearance,
      speech,
      thoughtProcessContent,
      appetite,
      behavior,
      orientation,
      affect,
      mood,
      judgement,
      sleep,
      concern,
    ].some((field) => field !== undefined && field !== null && field !== "");

    if (!hasFirstSet && !imageUrl && !importantNotes) {
      return res.status(400).json({
        message: "No valid data provided to update client history.",
      });
    }

    const clientHistory = {
      name,
      age,
      dateOfIntake,
      familyCurrentSituation,
      familyHistory,
      presentingProblem,
      pertinentHistory,
      tentativeGoalsAndPlans,
      observations,
      specialNeeds,
      diagnostic,
      riskBehaviors,
      appearance,
      speech,
      thoughtProcessContent,
      appetite,
      behavior,
      orientation,
      affect,
      mood,
      judgement,
      sleep,
      concern,
      imageUrl,
      importantNotes,
    };

    const userCollection = await db.collection("users");
    const result = await userCollection.updateOne(
      { _id: new ObjectId(userId), role:"user" ,isActive:true },
      { $set: { clientHistory: clientHistory } }
    );

    if (result.matchedCount === 0) {
      return res.status(400).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "Client history added successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const addSessionNotes = async (req, res) => {
  try {
    const db = getDb();
       console.log(">>",req.body);
       
        const {
            appointmentId,
            diagnosticImpression,
            sessionFocus,
            observations,
            clientGoals,
            therapeuticIntervention,
            tasksGiven,
            plannedIntervention,
            importantNotes,
            imageName,
        } = req.body;

        if (!appointmentId) {
            return res.status(400).json({
                message: "Missing appointment ID.",
                error: true,
            });
        }

        if (!ObjectId.isValid(appointmentId)) {
            return res.status(400).json({
                message: "Invalid appointment ID.",
                error: true,
            });
        }

        const appointmentCollection = await db.collection('appointments');
        const appointment = await appointmentCollection.findOne({ _id: new ObjectId(appointmentId) });

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found.",
                error: true,
            });
        }

        const userId = appointment.user_id;
        const therapistId = appointment.therapist_id

        const sessionNote = {
            appointmentId: new ObjectId(appointmentId),
            userId: new ObjectId(userId),
            therapistId: therapistId,
            diagnosticImpression,
            sessionFocus,
            observations,
            clientGoals,
            therapeuticIntervention,
            tasksGiven,
            plannedIntervention,
            importantNotes,
            attachment:imageName,
            noteStatus: "private",  // Default status
            sharedWith: [],  // Stores therapist IDs who accepted the notes
            created_at: moment().toISOString(),
        };

        const sessionNotesCollection = await db.collection('sessionNotes');

        const result = await sessionNotesCollection.insertOne(sessionNote);

        if (!result.insertedId) {
            return res.status(500).json({
                message: "Failed to add session note.",
                error: true,
            });
        }

        return res.status(200).json({
            message: "Session notes added successfully.",
            data: sessionNote,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.toString(),
        });
    }

};

const editSessionNotes = async (req, res) => {
  try {
    const db = getDb();
    const therapist = req.user;
    console.log(req.body);
    
    const {
      _id,
      appointmentId,
      diagnosticImpression,
      sessionFocus,
      observations,
      clientGoals,
      therapeuticIntervention,
      tasksGiven,
      plannedIntervention,
      importantNotes,
      imageName,
    } = req.body;
 
    
    if (!_id || !appointmentId) {
      return res.status(400).json({
        message: "Missing session ID or appointment ID.",
        error: true,
      });
    }

    if (!ObjectId.isValid(_id) || !ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        message: "Invalid session ID or appointment ID.",
        error: true,
      });
    }

    const sessionNotesCollection = await db.collection("sessionNotes");
    const sessionNote = await sessionNotesCollection.findOne({
      _id: new ObjectId(_id),
      $or: [
        { therapistId: new ObjectId(therapist._id) },
        { sharedWith: new ObjectId(therapist._id) },
      ],
    });

    if (!sessionNote) {
      return res.status(404).json({
        message: "Session note not found.",
        error: true,
      });
    }

    const appointmentCollection = await db.collection("appointments");
    const appointment = await appointmentCollection.findOne({
      _id: new ObjectId(appointmentId),
    });

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found.",
        error: true,
      });
    }

    const userId = appointment.user_id;

    const updatedSessionNote = {
      appointmentId: new ObjectId(appointmentId),
      userId: new ObjectId(userId),
      diagnostic:diagnosticImpression,
      sessionFocus,
      observations,
      clientGoals,
      therapeuticIntervention,
      tasksGiven,
      plannedIntervention,
      importantNotes,
      attachment:imageName,
      updated_at: moment().toISOString(),
    };

    const result = await sessionNotesCollection.updateOne(
      { _id: new ObjectId(_id) },
      { $set: updatedSessionNote }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({
        message: "Failed to update session note.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Session notes updated successfully.",
      data: updatedSessionNote,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getAllSessionNotesByAppointmentId = async (req, res) => {
  try {
    const db = getDb();
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        message: "Missing required field: appointmentId.",
        error: true,
      });
    }

    if (!ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        message: "Invalid appointment ID.",
        error: true,
      });
    }

    const sessionNotesCollection = await db.collection("sessionNotes");
    const sessionNotes = await sessionNotesCollection.find({appointmentId: new ObjectId(appointmentId)}).toArray();

    if (!sessionNotes.length) {
      return res.status(404).json({
        message: "No session notes found for the given appointment ID.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Session notes retrieved successfully.",
      data: sessionNotes,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getSessionNotesById = async (req, res) => {
  try {
    const db = getDb();
    const { sessionId } = req.body;
    const therapist = req.user;

    if (!sessionId) {
      return res.status(400).json({
        message: "Missing required field: sessionId.",
        error: true,
      });
    }

    if (!ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        message: "Invalid session ID.",
        error: true,
      });
    }

    const sessionNotesCollection = await db.collection("sessionNotes");
    const sessionNote = await sessionNotesCollection.findOne({
      _id: new ObjectId(sessionId),
      $or: [
        { therapistId: new ObjectId(therapist._id) },
        { sharedWith: new ObjectId(therapist._id) },
      ],
    });

    if (!sessionNote) {
      return res.status(404).json({
        message: "Session note not found.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Session note retrieved successfully.",
      data: sessionNote,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getAllSessionNotesByUserId = async (req, res) => {
  try {
    const { userId , therapistId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "Missing required fields: userId .",
        error: true,
      });
    }

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid userId.",
        error: true,
      });
    }

    const db = getDb();
    const sessionNotesCollection = db.collection("sessionNotes");

    // Fetch notes created by the therapist or notes shared and accepted by the therapist
    const sessionNotes = await sessionNotesCollection
      .find({
        userId: new ObjectId(userId),
        $or: [
          { therapistId: new ObjectId(therapistId) },
          { sharedWith: new ObjectId(therapistId) },
        ],
      })
      .toArray();

    if (!sessionNotes.length) {
      return res.status(404).json({
        message: "No session notes found for the given user and therapist.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Session notes retrieved successfully.",
      data: sessionNotes,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getAllUser = async (req, res) => {
  try {
    const db = getDb();
    const users = await db.collection("users").find({ role: "user" , isActive:true }).toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

const getAllTherapist = async (req, res) => {
  try {
    const db = getDb();
    const concernsCollection = db.collection("concerns");
    const expertiseCollection = db.collection("expertise");
    const specializationCollection = db.collection("specialization");
    
    const therapists = await db.collection("users").find({ role: "therapist",isActive:false }).toArray();
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
    res.status(200).json(therapists);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch therapists" });
  }
};

const sendSessionNotes = async (req, res) => {
  try {
    const db = getDb();
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        message: "Missing required field: userId.",
        error: true,
      });
    }

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid userId.",
        error: true,
      });
    }

    const referralsCollection = db.collection("referrals");
    const sessionNotesCollection = db.collection("sessionNotes");

    // Fetch the referral for the given userId
    const referral = await referralsCollection.findOne({
      client_id: new ObjectId(userId),
    });

    if (!referral) {
      return res.status(404).json({
        message: "Referral not found for the given user.",
        error: true,
      });
    }

    // Assuming the `therapists` array contains the referred therapists, find the relevant therapist
    const referredTherapist = referral.therapists.find(
      (therapist) => therapist.status === "accepted"
    );

    if (!referredTherapist) {
      return res.status(404).json({
        message: "No referred therapist found who accepted the referral.",
        error: true,
      });
    }

    const referredTherapistId = referredTherapist.therapist_id;

    // Find all session notes related to the user
    const sessionNotes = await sessionNotesCollection
      .find({ userId: new ObjectId(userId) })
      .toArray();
    if (!sessionNotes.length) {
      return res.status(404).json({
        message: "No session notes found for the given user.",
        error: true,
      });
    }

    // Update all session notes to add the referred therapist and set noteStatus to "shared"
    const result = await sessionNotesCollection.updateMany(
      { userId: new ObjectId(userId) },
      {
        $addToSet: { sharedWith: new ObjectId(referredTherapistId) },
        $set: { noteStatus: "shared" },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({
        message: "Failed to send session notes.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Session notes shared successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const acceptSessionNotes = async (req, res) => {
  try {
    const db = getDb();
    const { therapistId } = req.body;
    const user = req.user;

    if (!therapistId) {
      return res.status(400).json({
        message: "Missing required fields: userId or therapistId.",
        error: true,
      });
    }

    if (!ObjectId.isValid(therapistId)) {
      return res.status(400).json({
        message: "Invalid userId or therapistId.",
        error: true,
      });
    }

    const sessionNotesCollection = db.collection("sessionNotes");

    // Find all session notes related to the user that are shared with this therapist
    const sessionNotes = await sessionNotesCollection
      .find({
        userId: new ObjectId(user._id),
        sharedWith: new ObjectId(therapistId),
      })
      .toArray();

    if (!sessionNotes.length) {
      return res.status(404).json({
        message:
          "No session notes found to accept for the given user and therapist.",
        error: true,
      });
    }

    // Update all session notes to set noteStatus to "accepted"
    const result = await sessionNotesCollection.updateMany(
      {
        userId: new ObjectId(user._id),
        sharedWith: new ObjectId(therapistId),
      },
      { $set: { noteStatus: "accepted" } }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({
        message: "Failed to accept session notes.",
        error: true,
      });
    }

    return res.status(200).json({
      message: "Session notes accepted successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    const db = getDb();
    const { imageUrl , therapistId } = req.body;
    if (!imageUrl || typeof imageUrl !== "string" || imageUrl.trim() === "") {
      return res.status(400).json({
        message: "Image URL is missing",
        error: true,
      });
    }

    const usersCollection = await db.collection("users");

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(therapistId) },
      { $set: { profile_image: imageUrl.trim() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "User image upload successfully.",
    });
  } catch {
    console.log("Error updating user:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const uploadClientProfilePicture = async (req, res) => {
  try {
    const db = getDb();
    const { imageUrl, userId } = req.body;
    if (!imageUrl || typeof imageUrl !== "string" || imageUrl.trim() === "") {
      return res.status(400).json({
        message: "Image URL is missing",
        error: true,
      });
    }

    const usersCollection = await db.collection("users");

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId), role:"user" ,isActive:true },
      { $set: { profile_image: imageUrl.trim() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "User image upload successfully.",
    });
  } catch {
    console.log("Error updating user:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const updateUserProfileDetail = async (req, res) => {
  try {
    const db = getDb();
    const userCollection = db.collection("users");
    const concernsCollection = db.collection("concerns");
    const userTypeCollection = db.collection("userTypes");

    const {
      name,
      phoneNumber,
      email,
      dob,
      gender,
      address,
      city,
      state,
      bloodGroup,
      pinCode,
      userType,
      concerns,
      subConcerns,
      userId,
    } = req.body;

    const updateData = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phone_number = phoneNumber;

    if (gender) updateData["profile_details.gender"] = gender;
    if (dob) updateData["profile_details.dob"] = dob;
    if (address) updateData["profile_details.address"] = address;
    if (city) updateData["profile_details.city"] = city;
    if (state) updateData["profile_details.state"] = state;
    if (bloodGroup) updateData["profile_details.blood_group"] = bloodGroup;
    if (pinCode) updateData["profile_details.pinCode"] = pinCode;

    if (userType) updateData.userType = userType;
    if (concerns) updateData.concerns = concerns;
    if (subConcerns) updateData.subConcerns = subConcerns;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update.",
        error: true,
      });
    }

    updateData.updatedAt = new Date();

    const result = await userCollection.updateOne(
      { _id: new ObjectId(userId), role:"user" ,isActive:true },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "User not found or update data is invalid.",
        error: true,
      });
    }

    const updatedUser = await userCollection.findOne(
      { _id: new ObjectId(userId), role:"user" ,isActive:true },
      { projection: { password: 0 } }
    );

    let concernsWithTitle = [];
    let subConcernsWithTitle = [];

    if (updatedUser?.concerns) {
      concernsWithTitle = await concernsCollection
        .find({ _id: { $in: updatedUser?.concerns.map(id => new ObjectId(id)) } })
        .project({ _id: 1, concern: 1 })
        .toArray();
    }

    if (updatedUser?.userType) {
      const userType = await userTypeCollection.findOne({ _id: new ObjectId(updatedUser.userType) });
      updatedUser.userType = userType;
    }

    if (updatedUser?.subConcerns && updatedUser.subConcerns.length > 0) {
      // Fetch all concerns and manually filter subConcerns
      const allConcerns = await concernsCollection
        .find({}, { projection: { _id: 1, subConcerns: 1 } })
        .toArray();

      subConcernsWithTitle = updatedUser.subConcerns.map(subConcernId => {
        for (const concern of allConcerns) {
          const foundSubConcern = concern.subConcerns?.find(sc => sc._id.toString() === subConcernId.toString());
          if (foundSubConcern) {
            return { _id: foundSubConcern._id, subConcern: foundSubConcern.subConcern };
          }
        }
        return null;
      }).filter(Boolean); // Remove null values
    }

    updatedUser.concerns = concernsWithTitle;
    updatedUser.subConcerns = subConcernsWithTitle;
    updatedUser.userType = updatedUser.userType || {};

    return res.status(200).json({
      message: "User details updated successfully.",
      data: updatedUser,
    });

  } catch (error) {
    console.error("Error updating user details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const getAllPrescriptionsByUser = async (req, res) => {
  try {
    const userDetails = req.user;

    // Validate the userId
    if (!userDetails) {
      return res.status(400).json({
        message: "Invalid user ID.",
        error: true,
      });
    }

    // Get a reference to the appointments collection
    const db = getDb();
    const appointmentsCollection = db.collection("appointments");

    // Find all appointments related to the user by userId
    const appointments = await appointmentsCollection
      .find({ user_id: new ObjectId(userDetails?._id) })
      .toArray();

    // Check if any appointments were found
    if (!appointments || appointments.length === 0) {
      return res.status(404).json({
        message: "No appointments found for the user.",
        error: true,
      });
    }

    // Extract prescriptions from all appointments
    const allPrescriptions = appointments
      .map((appointment) => appointment.prescriptions || []) // Default to an empty array if no prescriptions exist
      .flat(); // Flatten the array of arrays into a single array

    // Return the prescription list
    return res.status(200).json({
      message: "Prescriptions retrieved successfully.",
      data: allPrescriptions,
    });
  } catch (error) {
    console.error("Error retrieving prescriptions for user:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getAllTherapistByConcern = async (req, res) => {
  try {
    const { concernIds } = req.body;

    const db = getDb();
    const userCollection = db.collection("users");
    const concernsCollection = db.collection("concerns");
    const expertiseCollection = db.collection("expertise");
    const specializationCollection = db.collection("specialization");

    // Define the query object
    let query = { role: "therapist", isActive: false };

    // Only filter by concerns if concernIds is provided and not null
    if (concernIds && concernIds.length > 0) {
      query.concerns = { $in: concernIds };
    }

    const therapists = await userCollection.find(query).toArray();

    if (!therapists.length) {
      return res.status(404).json({ message: "No therapists found for the given concerns." });
    }

    // Enrich therapists with concerns, expertise, and specialization
    for (let therapist of therapists) {
      if (therapist.concerns && therapist.concerns.length > 0) {
        const concernsData = await concernsCollection
          .find({ _id: { $in: therapist.concerns.map(id => new ObjectId(id)) } })
          .project({ _id: 1, concern: 1 })
          .toArray();
        therapist.concerns = concernsData;
      }

      if (therapist.expertise && therapist.expertise.length > 0) {
        const expertiseData = await expertiseCollection
          .find({ _id: { $in: therapist.expertise.map(id => new ObjectId(id)) } })
          .project({ _id: 1, name: 1 })
          .toArray();
        therapist.expertise = expertiseData;
      }

      if (therapist.specialization && therapist.specialization.length > 0) {
        const specializationData = await specializationCollection
          .find({ _id: { $in: therapist.specialization.map(id => new ObjectId(id)) } })
          .project({ _id: 1, name: 1 })
          .toArray();
        therapist.specialization = specializationData;
      }
    }

    res.status(200).json({
      message: "All Therapist get successfully.",
      data: therapists,
    });
  } catch (error) {
    console.error("Error fetching therapists by concern:", error);
    res.status(500).json({ message: "Failed to fetch therapists" });
  }
};

const getClientBookingHistory = async (req, res) => {
  try {
    const db = getDb();
    const { clientId } = req.params; // Assuming clientId is passed as a URL parameter

    if (!clientId || !ObjectId.isValid(clientId)) {
      return res.status(400).json({
        message: "Invalid client ID.",
        error: true,
      });
    }

    const appointmentsCollection = db.collection("appointments");
    const usersCollection = db.collection("users");

    // Fetch all appointments for the client
    const appointments = await appointmentsCollection.find({
      user_id: new ObjectId(clientId),
    }).sort({ booking_date: -1 }).toArray(); // Sorting by booking date (latest first)

    if (!appointments.length) {
      return res.status(404).json({
        message: "No booking history found for this client.",
        error: true,
      });
    }

    // Fetch therapist details for all appointments
    const therapistIds = [...new Set(appointments.map(app => app.therapist_id))];

    const therapists = await usersCollection.find({
      _id: { $in: therapistIds.map(id => new ObjectId(id)) },
      role: "therapist",
    }).toArray();

    // Create a map of therapist ID to therapist details
    const therapistMap = {};
    therapists.forEach(therapist => {
      therapistMap[therapist._id] = {
        name: therapist?.name || "Unknown",
        specialization: therapist?.profile_details?.specialization || "Not specified",
        gender: therapist?.profile_details?.gender || "Not specified",
      };
    });

    // Format the response
    const response = appointments.map(appointment => ({
      appointmentId: appointment._id,
      therapist: therapistMap[appointment.therapist_id] || { name: "Unknown" },
      bookingDate: appointment.booking_date,
      bookingSlots: appointment.booking_slots,
      duration: appointment.booking_duration,
      type: appointment.type,
      bookingType: appointment.booking_type,
      amount: appointment.amount,
      paymentStatus: appointment.payment_status === 1 ? "Paid" : "Pending",
      status: appointment.booking_status === 1 ? "Completed" : "Upcoming",
      createdAt: appointment.created_at,
    }));

    return res.status(200).json({
      message: "Client booking history retrieved successfully.",
      data: response,
    });
  } catch (error) {
    console.error("Error retrieving booking history:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.toString(),
    });
  }
};

const getAllLiveChatTherapist = async (req, res) => {
  try {
    const db = getDb();
    const userCollection = db.collection("users");
    const concernsCollection = db.collection("concerns");
    const expertiseCollection = db.collection("expertise");
    const specializationCollection = db.collection("specialization");

    // Define the query object to find active therapists with isLiveChat: true
    let query = {
      role: "therapist",
      isActive: true,
      "action.isLiveChat": true, // Filter therapists who can take live chat sessions
    };

    const projection = {
      name: 1,
      email: 1,
      phone_number: 1,
      role: 1,
      isActive: 1,
      "profile_details.gender": 1,
      "profile_details.dob": 1,
      "profile_details.designation": 1,
      "profile_details.experience": 1,
      "profile_details.languages": 1,
      "profile_details.address": 1,
      "profile_details.city": 1,
      "profile_details.state": 1,
      "profile_details.biography": 1,
      "profile_details.google_meet_link": 1,
      educational_qualification: 1,
      sessionPricing: 1,
      action: 1, // Includes isLiveChat
      concerns: 1,
      expertise: 1,
      specialization: 1,
    };

    const therapists = await userCollection.find(query).project(projection).toArray();

    if (!therapists.length) {
      return res.status(404).json({ message: "No therapists found for live chat sessions." });
    }

    // Enrich therapists with concerns, expertise, and specialization details
    for (let therapist of therapists) {
      if (therapist.concerns && therapist.concerns.length > 0) {
        const concernsData = await concernsCollection
          .find({ _id: { $in: therapist.concerns.map(id => new ObjectId(id)) } })
          .project({ _id: 1, concern: 1 })
          .toArray();
        therapist.concerns = concernsData;
      }

      if (therapist.expertise && therapist.expertise.length > 0) {
        const expertiseData = await expertiseCollection
          .find({ _id: { $in: therapist.expertise.map(id => new ObjectId(id)) } })
          .project({ _id: 1, name: 1 })
          .toArray();
        therapist.expertise = expertiseData;
      }

      if (therapist.specialization && therapist.specialization.length > 0) {
        const specializationData = await specializationCollection
          .find({ _id: { $in: therapist.specialization.map(id => new ObjectId(id)) } })
          .project({ _id: 1, name: 1 })
          .toArray();
        therapist.specialization = specializationData;
      }
    }

    res.status(200).json({
      message: "Therapists who can take live chat retrieved successfully.",
      data: therapists,
    });
  } catch (error) {
    console.error("Error fetching therapists for live chat:", error);
    res.status(500).json({ message: "Failed to fetch therapists" });
  }
};

const startChat = async (req, res) => {
  try {
    const db = getDb();
    const liveChatCollection = db.collection("live_chats");

    const { clientId, therapistId } = req.body;

    if (!clientId || !therapistId) {
      return res.status(400).json({
        message: "clientId and therapistId are required.",
        error: true,
      });
    }

    const liveChatId = new ObjectId(); // Generate a unique ID for live chat session
    const createdAt = new Date();

    const chatSession = {
      liveChatId,
      clientId: new ObjectId(clientId),
      therapistId: new ObjectId(therapistId),
      createdAt,
      updatedAt: createdAt,
    };

    await liveChatCollection.insertOne(chatSession);

    return res.status(200).json({
      message: "Live chat session started successfully.",
      data: chatSession,
    });
  } catch (error) {
    console.error("Error starting live chat session:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

const endChat = async (req, res) => {
  try {
    const db = getDb();
    const liveChatCollection = db.collection("live_chats");
    const userCollection = db.collection("users");
    const paymentCollection = db.collection("payments");

    const { liveChatId, duration, price, endedBy, reason, reason_desc } = req.body;

    if (!liveChatId || !duration || price < 0 || !endedBy) {
      return res.status(400).json({
        message: "liveChatId, duration, price, and endedBy are required.",
        error: true,
      });
    }

    if (endedBy === "therapist" && (!reason || !reason_desc)) {
      return res.status(400).json({
        message: "Reason and reason_desc are required when endedBy is 'therapist'.",
        error: true,
      });
    }

    // Find live chat session
    const chatSession = await liveChatCollection.findOne({ liveChatId : new ObjectId(liveChatId) });

    if (!chatSession) {
      return res.status(404).json({
        message: "Live chat session not found.",
        error: true,
      });
    }

    const { clientId, therapistId } = chatSession;
    const parsedPrice = parseFloat(price);

    // Fetch client details
    const client = await userCollection.findOne({
      _id: new ObjectId(clientId),
      role: "user",
      isActive: true,
    });

    if (!client) {
      return res.status(400).json({
        message: "Client not found or inactive.",
        error: true,
      });
    }

    // Fetch therapist details using projection
    const projection = {
      name: 1,
      email: 1,
      phone_number: 1,
      role: 1,
      isActive: 1,
      "profile_details.gender": 1,
      "profile_details.dob": 1,
      "profile_details.designation": 1,
      "profile_details.experience": 1,
      "profile_details.languages": 1,
      "profile_details.address": 1,
      "profile_details.city": 1,
      "profile_details.state": 1,
      "profile_details.biography": 1,
      "profile_details.google_meet_link": 1,
      educational_qualification: 1,
      sessionPricing: 1,
      action: 1, // Includes isLiveChat
      concerns: 1,
      expertise: 1,
      specialization: 1,
    };

    const therapist = await userCollection.findOne(
      { _id: new ObjectId(therapistId), role: "therapist", isActive: true },
      { projection }
    );

    if (!therapist) {
      return res.status(400).json({
        message: "Therapist not found or inactive.",
        error: true,
      });
    }

    // Ensure wallet payment only
    const walletBalance = parseFloat(client.wallet_amount) || 0;
    if (walletBalance < parsedPrice) {
      return res.status(400).json({
        message: "Insufficient wallet balance. Live chat can only be paid using a wallet.",
        error: true,
      });
    }

    // Deduct amount from client's wallet
    const newWalletAmount = walletBalance - parsedPrice;
    await userCollection.updateOne(
      { _id: new ObjectId(clientId), role: "user", isActive: true },
      { $set: { wallet_amount: newWalletAmount } }
    );

    // Update live chat session
    const updatedAt = new Date();
    const updateData = {
      duration: parseInt(duration),
      price: parsedPrice,
      updatedAt,
      endedBy,
    };

    if (endedBy === "therapist") {
      updateData.reason = reason;
      updateData.reason_desc = reason_desc;
    }

    await liveChatCollection.updateOne({ liveChatId: new ObjectId(liveChatId) }, { $set: updateData });

    // Store payment transaction
    const currentTimeIST = new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const paymentRecord = {
      order_id: generateWalletId(),
      payment_id: generateWalletId(),
      amount: parsedPrice,
      appointment_id: new ObjectId(liveChatId),
      user_id: new ObjectId(clientId),
      therapist_id: new ObjectId(therapistId),
      name: client.name,
      drcr: "Debit",
      date: new Date(),
      time: currentTimeIST,
      type: "live_chat",
    };

    await paymentCollection.insertOne(paymentRecord);

    return res.status(200).json({
      message: "Live chat session ended successfully. Wallet balance updated.",
      data: {
        liveChatId,
        clientId,
        therapistId,
        duration,
        price: parsedPrice,
        endedBy,
        reason: endedBy === "therapist" ? reason : null,
        reason_desc: endedBy === "therapist" ? reason_desc : null,
        updatedAt,
        therapistDetails: therapist, // Therapist details added here
      },
    });
  } catch (error) {
    console.error("Error ending live chat session:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: true,
    });
  }
};

module.exports = {
  userDetails,
  addUser,
  getAllTherapistUsers,
  getUserDetails,
  addClientHistory,
  addSessionNotes,
  editSessionNotes,
  getAllSessionNotesByAppointmentId,
  getSessionNotesById,
  getAllSessionNotesByUserId,
  getUserDetailsByEmail,
  getClientHistory,
  editUser,
  getAllUser,
  sendSessionNotes,
  acceptSessionNotes,
  uploadProfilePicture,
  uploadClientProfilePicture,
  updateUserProfileDetail,
  getAllPrescriptionsByUser,
  getAllUsersByTherapist,
  getAllTherapist,
  getAllTherapistByConcern,
  getClientBookingHistory,
  getAllLiveChatTherapist,
  startChat,
  endChat
};
