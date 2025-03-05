const { getDb } = require("../db/db");
const { ObjectId } = require("mongodb"); // If you're using MongoDB and need to work with ObjectId

const createSessation = async (req, res) => {
  try {
    const db = getDb(); // Get the database connection
    const {
      category,
      type,
      duration,
      topic,
      description,
      timeSlot,
      dateValue,
      time,
      language,
      community,
      guestLimit,
      googleMeet,
    } = req.body;

    // Check if all required fields are present
    if (
      !category ||
      !type ||
      !duration ||
      !topic ||
      !description ||
      !timeSlot ||
      !dateValue ||
      !time ||
      !language ||
      !community ||
      !guestLimit ||
      !googleMeet
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const userId = req.user._id; // Extract user ID from the authenticated request

    // Create the session object with therapistId
    const newSessation = {
      category,
      type,
      duration,
      topic,
      description,
      timeSlot,
      dateValue,
      time,
      language,
      community,
      guestLimit,
      googleMeet,
      therapistId: userId, // Add therapistId field to store the user ID who created the session
      createdAt: new Date(), // Add a timestamp for when the session is created
    };

    // Insert the session into the database
    const result = await db.collection("groupSessions").insertOne(newSessation);
    const sessionId = result.insertedId;
    console.log("sess>>", sessionId);

    // Update the user's groupSessation array with the new session ID
    console.log(userId);
    await db.collection("users").updateOne(
      { _id: userId, role:"user" ,isActive:true },
      { $push: { groupSessation: sessionId } } // Push the new session ID into the groupSessation array
    );

    // Return the ID of the created document
    res
      .status(200)
      .json({ message: "Group session created successfully", sessionId });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const getGroupSessationDetials = async (req, res) => {
  try {
    const { id } = req.body; // Extract the id from the request body
    const db = getDb(); // Get the database connection
    console.log(id);

    // Find the document by its _id
    const result = await db
      .collection("groupSessions")
      .findOne({ _id: new ObjectId(id) });

    if (result) {
      res.status(200).json(result); // Send the found document as the response
    } else {
      res.status(404).json({ message: "Session not found" }); // Handle case where no document is found
    }
  } catch (error) {
    console.error(error); // Log any errors that occur
    res.status(500).json({ message: "Internal server error" }); // Send a generic error response
  }
};

const getAllGroupSessionsForClient = async (req, res) => {
  try {
    // Get the database connection
    const db = getDb();

    // Fetch all group sessions from the groupSessions collection
    const sessions = await db.collection("groupSessions").find().toArray();
    console.log("sessions>>", sessions);

    if (!sessions || sessions.length === 0) {
      return res.status(404).json({ message: "No group sessions found" });
    }

    // Fetch the users collection
    const usersCollection = db.collection("users");

    // Map through sessions to include therapist details
    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        if (session.therapistId) {
          const therapist = await usersCollection.findOne({
            _id: new ObjectId(session.therapistId),
          });

          return {
            ...session,
            therapistImage: therapist?.profile_image || null, // Include therapist image if available
            therapistName: therapist?.name || "Unknown", // Include therapist name if available
          };
        }
        return session; // Return session as is if no therapistId
      })
    );

    // Separate sessions into the three categories
    const workshops = [];
    const peerSupport = [];
    const groupTherapy = [];

    enrichedSessions.forEach((session) => {
      switch (session.category) {
        case "Workshop":
          workshops.push(session);
          break;
        case "Peer 2 peer support":
          peerSupport.push(session);
          break;
        case "Group therapy":
          groupTherapy.push(session);
          break;
        default:
          break;
      }
    });

    // Send the categorized sessions as the response
    res.status(200).json({
      workshops,
      peerSupport,
      groupTherapy,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllGroupSessions = async (req, res) => {
  try {
    console.log("therapistId>>",req.user._id);
    
    const userId = req.user._id; // Extract the user ID from the request
    console.log("userId", userId);

    // Get the database connection
    const db = getDb();

    // Fetch the user document to get the groupSessation field
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId), role:"user" ,isActive:true });
    console.log("user>>", user);

    if (!user || !user.groupSessation || user.groupSessation.length === 0) {
      return res
        .status(404)
        .json({ message: "No group sessions found for this user" });
    }

    // Fetch all group sessions where _id is in user.groupSessation
    const sessions = await db
      .collection("groupSessions")
      .find({
        _id: { $in: user.groupSessation.map((id) => new ObjectId(id)) },
      })
      .toArray();
    console.log("sessation>>", sessions);

    // Separate sessions into the three categories
    const workshops = [];
    const peerSupport = [];
    const groupTherapy = [];

    sessions.forEach((session) => {
      switch (session.category) {
        case "Workshop":
          workshops.push(session);
          break;
        case "Peer 2 peer support":
          peerSupport.push(session);
          break;
        case "Group therapy":
          groupTherapy.push(session);
          break;
        default:
          break;
      }
    });

    // Send the categorized sessions as the response
    res.status(200).json({
      workshops,
      peerSupport,
      groupTherapy,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addGuestListToGroupSession = async (req, res) => {
  try {
    const { id, guests } = req.body; // Group session ID and guests array
    const db = getDb();
   console.log("called");
   
    // Fetch the session document to get the current guest list and guest limit
    const session = await db.collection("groupSessions").findOne({ _id: new ObjectId(id) });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const { guestList = [], guestLimit } = session;

    // Filter out duplicate guests based on _id (whether from previous session creation or new additions)
    const newGuests = guests.filter(
      (guest) => !guestList.some(existingGuest => existingGuest._id.toString() === guest._id.toString())
    );

    if (newGuests.length === 0) {
      return res.status(400).json({ message: "All guests are already added" });
    }

    // Check if adding the new guests would exceed the guest limit
    const totalGuestsAfterAdding = guestList.length + newGuests.length;
    if (totalGuestsAfterAdding > guestLimit) {
      return res.status(400).json({ 
        message: `Cannot add guests. Guest limit (${guestLimit}) would be exceeded.` 
      });
    }

    // Prepare the guestList array for the new guests
    const guestListToAdd = newGuests.map((guest) => ({
      _id: guest._id,
      status: guest.status,
      paymentLink: guest.paymentLink,
      payment: guest.payment,
    }));

    // Update the session document by pushing the new guests
    const result = await db.collection("groupSessions").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { guestList: { $each: guestListToAdd } }, // Add only the filtered new guests
      }
    );

    if (result.modifiedCount > 0) {
      res.status(200).json({ message: "Guests added successfully" });
    } else {
      res.status(500).json({ message: "Failed to add guests" });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};



const updateGuestStatus = async (req, res) => {
  console.log("updateGuestStatus",req.body);
  
  try {
    // id is sessationId id but _id is guest id in guestlist of grpupSesaation
    const { id, _id, status, paymentLink, payment } = req.body; // Extract details from the request body
    const db = getDb(); // Get the database connection
    console.log(id);
    console.log(_id);
    console.log(status, paymentLink, payment);

    // Build the update object dynamically
    let updateFields = {};
    if (status !== undefined) updateFields["guestList.$.status"] = status;
    if (paymentLink !== undefined)
      updateFields["guestList.$.paymentLink"] = paymentLink;
    if (payment !== undefined) updateFields["guestList.$.payment"] = payment;
    console.log(updateFields);

    if (Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided for update" });
    }

    // Update the specific guest's status within the guestList array
    const result = await db
      .collection("groupSessions")
      .updateOne(
        { _id: new ObjectId(id), "guestList._id": _id },
        { $set: updateFields }
      );

    if (result.modifiedCount > 0) {
      res.status(200).json({ message: "Guest status updated successfully" });
    } else {
      res.status(404).json({ message: "Guest or session not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// const removeGuestFromSession = async (req, res) => {
//   try {
//     // id is sessation id but _id is guest id in guestlist of grpupSesaation
//     const { id, _id } = req.body; // Extract details from the request body
//     const db = getDb(); // Get the database connection

//     // Pull the guest with the specified guestId from the guestList array
//     const result = await db.collection("groupSessions").updateOne(
//       { _id: new ObjectId(id) },
//       {
//         $pull: { guestList: { _id } },
//       }
//     );

//     if (result.modifiedCount > 0) {
//       res.status(200).json({ message: "Guest removed successfully" });
//     } else {
//       res.status(404).json({ message: "Guest or session not found" });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

const removeGuestFromSession = async (req, res) => {
  console.log("Request body:", req.body);

  try {
    const { id, guestId } = req.body; // Session ID, guestId is an array of guest IDs
    const db = getDb(); // Get the database connection

    // Ensure guestId is an array and not empty
    if (!Array.isArray(guestId) || guestId.length === 0) {
      return res.status(400).json({ message: "Invalid guest IDs" });
    }

    // Check if the session ID is a valid ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    // Convert session ID to ObjectId
    const sessionId = new ObjectId(id);

    // Log guest IDs for debugging
    console.log("Valid Guest IDs to delete:", guestId);

    // Pull guests from guestList whose _id is in the guestId array
    const result = await db.collection("groupSessions").updateOne(
      { _id: sessionId }, // Match session by its ID
      {
        $pull: { guestList: { _id: { $in: guestId } } }, // Remove guests from guestList
      }
    );

    console.log("Update result:", result);

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (result.modifiedCount > 0) {
      res.status(200).json({ message: "Guests removed successfully" });
    } else {
      res.status(404).json({ message: "Guests not found in the session" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};




const getGuestListFromGroupSession = async (req, res) => {
  console.log("inside guestList>>");

  try {
    const { id } = req.body; // Expecting the session id
    const db = getDb(); // Get the database connection

    // Find the document by its _id and only return the guestList field
    const session = await db.collection("groupSessions").findOne(
      { _id: new ObjectId(id) },
      { projection: { guestList: 1, _id: 0 } } // Project only the guestList field
    );

    if (!session || !session.guestList) {
      return res.status(404).json({ message: "Session or guest list not found" });
    }

    const guestList = session.guestList;

    // Fetch user details for each guest
    const updatedGuestList = await Promise.all(
      guestList.map(async (guest) => {
        // Assuming the guest._id is the user ID and you have a 'users' collection where user data is stored
        const user = await db.collection('users').findOne(
          { _id: new ObjectId(guest._id) },
          { projection: { name: 1, email: 1, phone_number: 1 } } // Fetch the required fields
        );

        if (user) {
          return {
            ...guest, // Include the existing fields (status, paymentLink, payment)
            name: user.name,
            email: user.email,
            phone_number: user.phone_number
          };
        } else {
          return {
            ...guest, // If the user is not found, return the original guest data
            name: null,
            email: null,
            phone_number: null
          };
        }
      })
    );

    // Respond with the updated guest list containing user details
    res.status(200).json(updatedGuestList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const clientsignupForGroupTherapy = async (req, res) => {
  try {
    const userId = req.user._id.toString(); // Keep userId as a string
    const { sessionId, amount, drcr, type, order_id, payment_id } = req.body;

    console.log("userId", userId);
    console.log("sessionId", sessionId);

    const db = getDb(); // Get the database connection

    // Convert sessionId to ObjectId (this is fine to leave as ObjectId)
    const sessionObjectId = new ObjectId(sessionId);

    // Find the session by its _id
    const session = await db
      .collection("groupSessions")
      .findOne({ _id: sessionObjectId });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Extract the therapist ID from the session document
    const therapistId = session.therapistId; // Ensure therapistId remains as string, assuming it follows the same structure

    console.log("therapistId", therapistId);
    console.log("userId", userId);
    console.log("sessionObjectId", sessionObjectId);

    // Check if the user already exists in the guestList by comparing with `_id`
    const existingGuest = session.guestList.find(
      (guest) => guest._id === userId
    );

    console.log("existingGuest", existingGuest);

    if (existingGuest) {
      // User already exists, update the payment status using array filters
      const result = await db.collection("groupSessions").updateOne(
        { _id: sessionObjectId },
        {
          $set: { "guestList.$[guest].payment": true },
        },
        {
          arrayFilters: [{ "guest._id": userId }], // Use userId as a string to match guestList _id field
        }
      );

      console.log("Update result:", result);

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "User not found in guest list." });
      }

      console.log("Payment status updated for user in guestList.");
    } else {
      // User doesn't exist, add a new guest to the guestList
      await db.collection("groupSessions").updateOne(
        { _id: sessionObjectId },
        {
          $push: {
            guestList: {
              _id: userId, // Keep _id as a string
              status: false,
              paymentLink: false,
              payment: true, // Payment is done
            },
          },
        }
      );
      console.log("Guest added to session.");
    }

    // Define the payment details including the date and time
    const paymentDetails = {
      user_id: userId,
      therapist_id: therapistId,
      sessionId: sessionObjectId,
      amount,
      drcr,
      type,
      order_id,
      payment_id,
      date: new Date().toISOString(), // Store date in ISO format
      time: new Date().toTimeString().split(" ")[0], // Store time in "HH:MM:SS" format
      timestamp: new Date(), // Full timestamp (ISO format)
    };

    // Update payment history for the user
    await db.collection("payments").insertOne(paymentDetails);
    console.log("Payment history updated for user.");

    return res.status(200).json({ message: "Payment details updated and guest added." });
  } catch (error) {
    console.error(error); // Log any errors that occur
    return res.status(500).json({ message: "Internal server error" });
  }
};



module.exports = {
  createSessation,
  getGroupSessationDetials,
  getAllGroupSessions,
  addGuestListToGroupSession,
  updateGuestStatus,
  removeGuestFromSession,
  getGuestListFromGroupSession,
  getAllGroupSessionsForClient,
  clientsignupForGroupTherapy
};
