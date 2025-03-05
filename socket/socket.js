const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken");
const app = express();
const { getDb } = require("../db/db");
const { ObjectId } = require("mongodb");

/***socket connection */
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let user; // Define user outside

// Mapping of userId to socketId
const userSockets = new Map();

io.use(async (socket, next) => {
  try {
    const { token } = socket.handshake.query;
    console.log(token, "Token in middleware");

    user = await getUserDetailsFromToken(token); // Pass the actual token
    console.log(user._id, "User detail from middleware user is comming from  token verification");

    if (user?.notvalid) {
      console.log("Invalid token or user not found");
      return next(
        new Error("Authentication error: User not valid or token expired")
      );
    }

    // Add user details to socket object if valid
    next(); // Allow the connection to proceed
  } catch (e) {
    console.log(e, "Error in socket middleware");
    next(new Error("Authentication error")); // Block the connection
  }
});

io.on("connection", async (socket) => {
  try {
    // Connection will only proceed if the middleware calls next()
    console.log("Socket connected", socket.id,user ,"user come after verification of token in middleware");

    // User details should now be available in socket.user (from the middleware)

    const count = io.engine.clientsCount;
    const sockets = await io.fetchSockets();

    // Log connected sockets
    for (const socket of sockets) {
      console.log(socket.id);
    }

    const db = getDb();
    const notifications = await db.collection("notifications");
    io.socketsJoin("room1");

    socket.on("notif", async (data) => {
      console.log(data, "User ID for mapping");
      if (data && socket.id) {
        userSockets.set(data.toString(), socket.id); // Ensure the user ID and socket ID are stored properly
        console.log(userSockets, "Mapping after setting");
      }

      const notificationdata = await notifications
        .find({ userId: data.toString() })
        .toArray();
      socket.emit("notifications", notificationdata);
    });

    // socket.on("referal", (data) => {
    //   const userIdList = data.userId;
    //   const socketIdList = userIdList
    //     .map((userId) => userSockets.get(userId))
    //     .filter(Boolean);
    //   console.log(socketIdList);
    //   const message = "Message for specific users";
    //   socketIdList.forEach((socketId) => {
    //     if (socketId) {
    //       io.to(socketId).emit("privateMessage", message);
    //     }
    //   });
    // });

    socket.on("therapist", async (data) => {
      console.log("Therapist event received:", data);
      console.log("therapist event called>>", new Date().toLocaleTimeString());

      data = {
        ...data,
        createdAt: new Date(),
      };
      await notifications.insertOne(data);
      console.log("Notification inserted:", data);

      console.log(userSockets, "mapped sockets");

      const recipientSocketId = userSockets.get(data?.userId);
      console.log(userSockets, "Current socket map for therapist event");
      if (recipientSocketId) {
        const updatedNotifications = await notifications
          .find({ userId: data?.userId })
          .toArray();
        io.to(recipientSocketId).emit("notifications", updatedNotifications);
        console.log(`Notification sent to user with ID: ${data.userId}`);
      } else {
        console.log(`User with ID ${data.userId} is not connected.`);
      }
    });

    socket.on("client", async (data) => {
      console.log("event trigger on ");
      console.log("client  event received:", data);

      data = {
        ...data,
        createdAt: new Date(),
      };
      await notifications.insertOne(data);
      console.log("Notification inserted:", data);
      const recipientSocketId = userSockets.get(data?.userId);

      console.log(recipientSocketId);
      if (recipientSocketId) {
        const updatedNotifications = await notifications
          .find({ userId: data?.userId })
          .toArray();
        io.to(recipientSocketId).emit("notifications", updatedNotifications);
        console.log(`Notification sent to user with ID: ${data.userId}`);
      } else {
        console.log(`User with ID ${data.userId} is not connected.`);
      }
    });

    socket.on("deleteNotification", async (data) => {
      const { notificationId, userId } = data; // Destructure directly from `data`
      console.log(userId, "::::", data); // This should print the userId and other data properly

      try {
        await notifications.deleteOne({ _id: new ObjectId(notificationId) });
        const updatedNotifications = await notifications
          .find({ userId: userId })
          .toArray();

        // Send the updated list back to the client
        socket.emit("notifications", updatedNotifications);
      } catch (err) {
        console.log(err, "Error in socket connection");
      }
    });
  } catch (err) {
    console.log(err, "Error in socket connection");
  }

  socket.on("setTherapistStatus", async ({ therapistId, isOnline }) => {
    const db = getDb();
    await db.collection("users").updateOne(
      { _id: new ObjectId(therapistId), role: "therapist" },
      { $set: { "action.isLiveChat": isOnline } }
    );
    io.emit("therapistStatusChanged", { therapistId, isOnline });
  });
  
  // Get Live Chat Therapists
  socket.on("getLiveChatTherapists", async () => {
    const db = getDb();
    const therapists = await db.collection("users")
      .find({ role: "therapist", isActive: true, "action.isLiveChat": true })
      .project({
        _id: 1,
        name: 1,
        email: 1,
        phone_number: 1,
        profile_details: 1,
        sessionPricing: 1
      })
      .toArray();
  console.log("list", therapists)
    socket.emit("liveChatTherapists", therapists);
  });
  
  // Client Starts a Chat with a Therapist
  socket.on("startLiveChat", async ({ clientId, therapistId }) => {
    const db = getDb();
  
    // Check if chat already exists
    let chatSession = await db.collection("live_chats").findOne({
      clientId: new ObjectId(clientId),
      therapistId: new ObjectId(therapistId),
      status: "running"
    });
  
    if (!chatSession) {
      chatSession = {
        liveChatId: new ObjectId(),
        clientId: new ObjectId(clientId),
        therapistId: new ObjectId(therapistId),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "running",
        messages: [],
        lastMessage: null,
        lastMessageSender: null,
        lastMessageStatus: null,
      };
  
      await db.collection("live_chats").insertOne(chatSession);
    }
  
    // Notify both users
    io.to(clientId).emit("chatStarted", chatSession);
    io.to(therapistId).emit("chatStarted", chatSession);
  });
  
  // Handle Sending Messages
  socket.on("sendLiveChatMessage", async ({ liveChatId, senderId, receiverId, message }) => {
    const db = getDb();
    const newMessage = {
      messageId: new ObjectId(),
      senderId: new ObjectId(senderId),
      receiverId: new ObjectId(receiverId),
      message,
      timestamp: new Date(),
      status: "sent"
    };
  
    // Update chat session with new message
    await db.collection("live_chats").updateOne(
      { liveChatId: new ObjectId(liveChatId) },
      {
        $push: { messages: newMessage },
        $set: {
          lastMessage: message,
          lastMessageSender: new ObjectId(senderId),
          lastMessageStatus: "sent",
          updatedAt: new Date()
        }
      }
    );
  
    // Emit message to both users
    io.to(senderId).emit("newLiveChatMessage", newMessage);
    io.to(receiverId).emit("newLiveChatMessage", newMessage);
  });
  
  // Handle Message Read
  socket.on("markLiveChatRead", async ({ liveChatId, readerId }) => {
    const db = getDb();
  
    await db.collection("live_chats").updateOne(
      { liveChatId: new ObjectId(liveChatId), "messages.receiverId": new ObjectId(readerId) },
      { $set: { "messages.$[].status": "read", lastMessageStatus: "read" } }
    );
  
    io.to(liveChatId).emit("messagesRead", { liveChatId, readerId });
  });
  
  // End Live Chat
  socket.on("endLiveChat", async ({ liveChatId, endedBy }) => {
    const db = getDb();
  
    await db.collection("live_chats").updateOne(
      { liveChatId: new ObjectId(liveChatId) },
      { $set: { status: "ended", updatedAt: new Date(), endedBy } }
    );
  
    io.to(liveChatId).emit("liveChatEnded", { liveChatId, endedBy });
  });
  
});

module.exports = {
  server,
  app,
};
