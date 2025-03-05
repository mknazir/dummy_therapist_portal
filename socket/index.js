const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken");
const { ObjectId } = require("mongodb");
const getConversation = require("../helpers/getConversation");
const { getDb } = require("../db/db");
const app = express();

/***socket connection */
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Your frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  },
});


/*
 * socket running at http://localhost:8080/
 */

const onlineUser = new Set();
let connectedUsers = {};
io.on("connection", async (socket) => {
  console.log("socket called>>");

  const db = getDb();
  // console.log(db);
  const { token } = socket.handshake.query;
  console.log(token);

  //current user details
  const user = await getUserDetailsFromToken(token);
  console.log(user, "detailsss",user.notvalid);
      
  if (user.notvalid) {
    console.log("No user found for the provided token");
    return;
  }

  const notifications = await db.collection("notifications");

  //create a room
  if (user && user._id) {
    socket.join(user?._id.toString());
    onlineUser.add(user?._id?.toString());
    console.log(onlineUser);
  }
  if (user && user._id) {
  const userId = user?._id.toString();
  connectedUsers[userId] = socket.id;
  console.log("Connected users:", connectedUsers);
  
  socket.join(userId);}

  io.emit("onlineUser", Array.from(onlineUser));

  socket.on("message-page", async (userId) => {
    console.log("userId", userId);
    const userDetails = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });
    const payload = {
      _id: userDetails?._id,
      name: userDetails?.name,
      email: userDetails?.email,
      profile_pic: userDetails?.profile_pic,
      online: onlineUser.has(userId),
    };

    socket.emit("message-user", payload);

    //get previous message
    const getConversationMessage = await db
      .collection("conversations")
      .findOne({
        $or: [
          { sender: new ObjectId(user?._id), receiver: new ObjectId(userId) },
          { sender: new ObjectId(userId), receiver: new ObjectId(user?._id) },
        ],
      });

    if (getConversationMessage) {
      await db
        .collection("conversations")
        .updateOne(
          { _id: getConversationMessage._id },
          { $push: { messages: new ObjectId(userId) } }
        );
    }

    socket.emit("message", getConversationMessage?.messages || []);
  });

  //new message
  socket.on("new message", async (data) => {
    //check conversation is available both user

    let conversation = await db.collection("conversations").findOne({
      $or: [
        {
          sender: new ObjectId(data?.sender),
          receiver: new ObjectId(data?.receiver),
        },
        {
          sender: new ObjectId(data?.receiver),
          receiver: new ObjectId(data?.sender),
        },
      ],
    });

    //if conversation is not available
    if (!conversation) {
      const createConversation = {
        sender: new ObjectId(data?.sender),
        receiver: new ObjectId(data?.receiver),
        messages: [],
      };
      const result = await db
        .collection("conversations")
        .insertOne(createConversation);
      conversation = result.ops[0];
    }

    const message = {
      text: data.text || "",
      imageUrl: data.imageUrl || "",
      videoUrl: data.videoUrl || "",
      seen: false,
      msgByUserId: new ObjectId(data?.msgByUserId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saveMessage = await db.collection("messages").insertOne(message);

    await db.collection("conversations").updateOne(
      { _id: conversation._id },
      {
        $push: { messages: saveMessage.insertedId },
      }
    );

    const getConversationMessage = await db
      .collection("conversations")
      .findOne({
        $or: [
          {
            sender: new ObjectId(data?.sender),
            receiver: new ObjectId(data?.receiver),
          },
          {
            sender: new ObjectId(data?.receiver),
            receiver: new ObjectId(data?.sender),
          },
        ],
      });

    io.to(data?.sender).emit("message", getConversationMessage?.messages || []);
    io.to(data?.receiver).emit(
      "message",
      getConversationMessage?.messages || []
    );

    //send conversation
    const conversationSender = await getConversation(data?.sender);
    const conversationReceiver = await getConversation(data?.receiver);

    io.to(data?.sender).emit("conversation", conversationSender);
    io.to(data?.receiver).emit("conversation", conversationReceiver);
  });

  //sidebar
  socket.on("sidebar", async (currentUserId) => {
    console.log("current user", currentUserId);

    const conversation = await getConversation(currentUserId);

    socket.emit("conversation", conversation);
  });

  socket.on("seen", async (msgByUserId) => {
    let conversation = await db.collection("conversations").findOne({
      $or: [
        {
          sender: new ObjectId(user?._id),
          receiver: new ObjectId(msgByUserId),
        },
        {
          sender: new ObjectId(msgByUserId),
          receiver: new ObjectId(user?._id),
        },
      ],
    });

    const conversationMessageId = conversation?.messages || [];

    await db.collection("messages").updateMany(
      {
        _id: { $in: conversationMessageId },
        msgByUserId: new ObjectId(msgByUserId),
      },
      { $set: { seen: true } }
    );

    //send conversation
    if (user && user._id) {
      const conversationSender = await getConversation(user?._id?.toString());
    }
    const conversationReceiver = await getConversation(msgByUserId);
    if (user && user._id) {
      io.to(user?._id?.toString()).emit("conversation", conversationSender);
    }
    io.to(msgByUserId).emit("conversation", conversationReceiver);
  });


  /*
    notification Sysytem 
    */
   let notificationdata=[];
   console.log(user,":::::")
  if (user ) {
    console.log(user._id, user.role, "for emiiting the data");
    notificationdata = await notifications.find({ role: user.role, userId: user?._id.toString() })
      .toArray();
  } else {
    console.error("User ID is null or undefined");
    notificationdata = [];
  }
  console.log(notificationdata, "data for emittion");
  socket.on("notif", (data) => {
    console.log(data,"socket.id from frontend");
    io.to(data).emit("notifications", notificationdata);
  });
  socket.on("therapist", async (data) => {
    console.log("Therapist event received:", data);
    
    data = {
      ...data,
      createdAt: new Date(),
    };
    
    try {
      await notifications.insertOne(data);
      console.log("Notification inserted:", data);

      const targetUserId = data.userId;
      console.log("Target user ID:", targetUserId);

      const targetSocketId = connectedUsers[targetUserId];
      console.log("Target socket ID:", targetSocketId);

      if (targetSocketId) {
        const updatedNotifications = await notifications
          .find({ role: data.role, userId: targetUserId })
          .toArray();
        
        console.log("Emitting notifications to target user:", updatedNotifications);
        io.to(targetSocketId).emit("notifications", updatedNotifications);
      } else {
        console.log("Target user not connected");
      }

      const therapistNotifications = await notifications
        .find({ role: user.role, userId: userId })
        .toArray();
      
      console.log("Emitting notifications to therapist:", therapistNotifications);
      io.to(socket.id).emit("notifications", therapistNotifications);
    } catch (error) {
      console.error("Error in therapist event:", error);
      socket.emit("error", { message: "Failed to process therapist notification." });
    }
  });


  socket.on("client", async (data) => {
    console.log("Therapist event received:", data);
    
    data = {
      ...data,
      createdAt: new Date(),
    };
    
    try {
      await notifications.insertOne(data);
      console.log("Notification inserted:", data);

      const targetUserId = data.userId;
      console.log("Target user ID:", targetUserId);

      const targetSocketId = connectedUsers[targetUserId];
      console.log("Target socket ID:", targetSocketId);

      if (targetSocketId) {
        const updatedNotifications = await notifications
          .find({ role: data.role, userId: targetUserId })
          .toArray();
        
        console.log("Emitting notifications to target user:", updatedNotifications);
        io.to(targetSocketId).emit("notifications", updatedNotifications);
      } else {
        console.log("Target user not connected");
      }

      const therapistNotifications = await notifications
        .find({ role: user.role, userId: userId })
        .toArray();
      
      console.log("Emitting notifications to therapist:", therapistNotifications);
      io.to(socket.id).emit("notifications", therapistNotifications);
    } catch (error) {
      console.error("Error in therapist event:", error);
      socket.emit("error", { message: "Failed to process therapist notification." });
    }
  });
  socket.on("deleteNotification", async (data) => {
    const { notificationId } = data;

    try {
      await notifications.deleteOne({ _id: new ObjectId(notificationId) });

      const updatedNotifications = await notifications
        .find({ role: user.role, userId: user._id.toString() })
        .toArray();
      const targetUserId = user._id.toString();
      const targetSocketId = connectedUsers[targetUserId];

      io.to(targetSocketId).emit("notifications", updatedNotifications);

    } catch (error) {
      console.error("Error deleting notification:", error);
      socket.emit("error", { message: "Failed to delete notification." });
    }
  });
  socket.on("disconnect", () => {
    const userId = Object.keys(connectedUsers).find(
      (key) => connectedUsers[key] === socket.id
    );
    if (userId) {
      delete connectedUsers[userId];

    }
  });




  // Therapist goes Online/Offline
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
  app,
  server,
};