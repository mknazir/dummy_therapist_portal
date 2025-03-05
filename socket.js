const { Server } = require("socket.io");
const http = require("http");
const { ObjectId } = require("mongodb");
const { getDb } = require("./db/db");

const app = require("express")();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const isValidObjectId = (id) => ObjectId.isValid(id) && new ObjectId(id).toString() === id;
const activeUsers = new Map(); // { userId: { socketId, role, status } }
const activeChats = new Map(); // { chatId: { clientId, therapistId, timer } }

// Helper functions
async function deductWallet(clientId, amount) {
  const db = getDb();
  const result = await db.collection("users").updateOne(
    { _id: new ObjectId(clientId), wallet_amount: { $gte: amount } },
    { $inc: { wallet_amount: -amount } }
  );
  return result.modifiedCount === 1;
}

async function createChatSession(clientId, therapistId, perMinRate) {
  const db = getDb();
  const chatData = {
    clientId: new ObjectId(clientId),
    therapistId: new ObjectId(therapistId),
    startTime: new Date(),
    status: "active",
    messages: [],
    deductions: [],
    perMinuteRate: perMinRate,
    totalCost: 0
  };

  const result = await db.collection("live_chats").insertOne(chatData);
  return { ...chatData, _id: result.insertedId };
}

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  // User authentication and registration
  socket.on("authenticate", async ({ userId, role }) => {
    if (!isValidObjectId(userId)) return;

    activeUsers.set(userId, {
      socketId: socket.id,
      role,
      status: role === "therapist" ? "offline" : "online"
    });

    // Update online status
    const db = getDb();
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { online: true, lastSeen: new Date() } }
    );

    // Broadcast therapist status
    if (role === "therapist") {
      io.emit("therapist-status", { userId, status: "offline" });
    }
  });

  // Add to your existing socket.io connection handler
  socket.on('get-therapist-status', async (userId) => {
    if (!isValidObjectId(userId)) return;

    const db = getDb();
    const therapist = await db.collection("users").findOne({
      _id: new ObjectId(userId),
      role: "therapist",
      isActive: true
    });

    if (therapist) {
      // Send current status from database
      socket.emit('therapist-status', therapist.status);
      
      // Update local activeUsers map
      activeUsers.set(userId.toString(), {
        socketId: socket.id,
        role: "therapist",
        status: therapist.status
      });
    }
  });

  // Modify existing status handler
  socket.on('set-therapist-status', async ({ userId, status }) => {
    if (!isValidObjectId(userId)) return;

    const db = getDb();
    const newStatus = status === 'online' ? 'online' : 'offline';
    
    // Update database
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId), role: "therapist" },
      { 
        $set: { 
          status: newStatus
        } 
      }
    );

    // Update local state
    const userData = activeUsers.get(userId);
    if (userData) {
      activeUsers.set(userId, { ...userData, status: newStatus });
    }

    // Broadcast to all clients
    io.emit("therapist-status-changed", {
      therapistId: userId,
      status: newStatus,
    });
  });

  // Get available therapists
  socket.on("get-therapists", async () => {
    const db = getDb();
    const therapists = await db.collection("users").find({ role: "therapist", 
      "action.isLiveChat": true,
      isActive: true }).toArray();
    socket.emit("therapists-list", therapists);
  });

  // Get All client
  socket.on("get-users", async ({ therapistId }) => {
    if (!isValidObjectId(therapistId)) return;
  
    const db = getDb();
  
    // Find all chat sessions for the therapist
    const pastChats = await db.collection("live_chats")
      .find({ therapistId: new ObjectId(therapistId) })
      .toArray();
  
    if (pastChats.length === 0) {
      socket.emit("users-list", []); // No past clients found
      return;
    }
  
    // Extract unique client IDs using JavaScript Set
    const clientIds = [...new Set(pastChats.map(chat => chat.clientId.toString()))];
  
    // Fetch client details from the users collection
    const clients = await db.collection("users")
      .find({ _id: { $in: clientIds.map(id => new ObjectId(id)) } })
      .toArray();
  
    // Send client list to frontend
    socket.emit("users-list", clients);
  });  

  // Start new chat
  // socket.on("start-chat", async ({ clientId, therapistId }) => {
  //   const db = getDb();
    
  //   // Check existing chat
  //   const existingChat = await db.collection("live_chats").findOne({
  //     clientId: new ObjectId(clientId),
  //     therapistId: new ObjectId(therapistId)
  //   });

  //   if (existingChat) {
  //     socket.emit("chat-started", existingChat);
  //     return;
  //   }

  //   // Check therapist availability
  //   const therapist = await db.collection("users").findOne({
  //     _id: new ObjectId(therapistId)
  //   });

  //   if (!therapist) {
  //     socket.emit("error", "Therapist is unavailable");
  //     return;
  //   }

  //   // Check client balance
  //   const client = await db.collection("users").findOne({ 
  //     _id: new ObjectId(clientId) 
  //   });
  //   const perMinRate = therapist.sessionPricing.chat.per_min;

  //   if (client.wallet_amount < perMinRate) {
  //     socket.emit("insufficient-balance", perMinRate);
  //     return;
  //   }

  //   // Create chat session
  //   const chatSession = await createChatSession(clientId, therapistId, perMinRate);
    
  //   // Deduct initial amount
  //   await deductWallet(clientId, perMinRate);
  //   await db.collection("live_chats").updateOne(
  //     { _id: chatSession._id },
  //     { 
  //       $push: { deductions: { amount: perMinRate, timestamp: new Date() } },
  //       $inc: { totalCost: perMinRate }
  //     }
  //   );

  //   // Start recurring deductions
  //   const timer = setInterval(async () => {
  //     const success = await deductWallet(clientId, perMinRate);
  //     if (success) {
  //       await db.collection("live_chats").updateOne(
  //         { _id: chatSession._id },
  //         { 
  //           $push: { deductions: { amount: perMinRate, timestamp: new Date() } },
  //           $inc: { totalCost: perMinRate }
  //         }
  //       );
  //     } else {
  //       clearInterval(timer);
  //       endChat(chatSession._id, clientId);
  //     }
  //   }, 60000);

  //   activeChats.set(chatSession._id.toString(), { 
  //     clientId, 
  //     therapistId,
  //     timer 
  //   });

  //   // Update therapist status
  //   await db.collection("users").updateOne(
  //     { _id: new ObjectId(therapistId) },
  //     { $set: { status: "busy" } }
  //   );
  //   io.emit("therapist-status", { userId: therapistId, status: "busy" });

  //   // Notify both users
  //   io.to(clientId).emit("chat-started", chatSession);
  //   io.to(therapistId).emit("new-chat", chatSession);
  // });

  socket.on("start-chat", async ({ clientId, therapistId }) => {
    const db = getDb();
  
    // Check for an existing chat session
    const existingChat = await db.collection("live_chats").findOne({
      clientId: new ObjectId(clientId),
      therapistId: new ObjectId(therapistId)
    });
  
    if (existingChat) {
      socket.emit("chat-started", existingChat);
      return;
    }
  
    // Fetch therapist pricing
    const therapist = await db.collection("users").findOne({ _id: new ObjectId(therapistId) });
    const perMinRate = therapist.sessionPricing.chat.per_min;
  
    // Create new chat session with additional fields
    const chatSession = {
      clientId: new ObjectId(clientId),
      therapistId: new ObjectId(therapistId),
      startTime: new Date(),
      status: "active",
      messages: [],
      deductions: [],
      perMinuteRate: perMinRate,
      totalCost: 0,
      lastMessage: null,
      unreadMessageCount: 0,
      updatedAt: new Date(),
    };
  
    const result = await db.collection("live_chats").insertOne(chatSession);
  
    // Notify users
    io.to(clientId).emit("chat-started", { ...chatSession, _id: result.insertedId });
    io.to(therapistId).emit("new-chat", { ...chatSession, _id: result.insertedId });
  });

  // Get the chat history if available
  socket.on("get-chat-history", async ({ therapistId, clientId }) => {
    if (!isValidObjectId(therapistId) || !isValidObjectId(clientId)) return;
  
    const db = getDb();
    const chat = await db.collection("live_chats").findOne({
      therapistId: new ObjectId(therapistId),
      clientId: new ObjectId(clientId)
    });
  
    if (chat) {
      socket.emit("chat-history", chat);
    }
  });  

  // Modified send-message handler
  // socket.on("send-message", async ({ chatId, senderId, message }) => {
  //   if (!message.trim() || !isValidObjectId(chatId)) return;

  //   const db = getDb();
  //   const newMessage = {
  //     _id: new ObjectId(),
  //     senderId: new ObjectId(senderId),
  //     content: message.trim(),
  //     timestamp: new Date(),
  //     status: "sent"
  //   };

  //   // Update database
  //   const updatedChat = await db.collection("live_chats").findOneAndUpdate(
  //     { _id: new ObjectId(chatId) },
  //     {
  //       $push: { messages: newMessage },
  //       $set: {
  //         lastMessage: newMessage.content,
  //         lastMessageSender: new ObjectId(senderId),
  //         updatedAt: new Date()
  //       }
  //     },
  //     { returnDocument: "after" }
  //   );

  //   // Get receiver ID
  //   const receiverId = updatedChat.value.clientId.equals(senderId) ? 
  //     updatedChat.value.therapistId.toString() : 
  //     updatedChat.value.clientId.toString();

  //   // Emit to both participants
  //   io.to(senderId).emit("new-message", {
  //     chatId,
  //     message: newMessage
  //   });
    
  //   io.to(receiverId).emit("new-message", {
  //     chatId,
  //     message: newMessage
  //   });
  // });

  // Start chat session if a client sends a message and there's no active chat
  
  
  socket.on("send-message", async ({ chatId, senderId, message }) => {
    if (!message.trim() || !ObjectId.isValid(chatId)) return;
    
    const db = getDb();
    const chat = await db.collection("live_chats").findOne({ _id: new ObjectId(chatId) });
  
    if (!chat) return;
  
    const newMessage = {
      _id: new ObjectId(),
      senderId: new ObjectId(senderId),
      content: message.trim(),
      timestamp: new Date(),
      status: "sent",
    };
  
    // Update chat in database
    await db.collection("live_chats").updateOne(
      { _id: new ObjectId(chatId) },
      {
        $push: { messages: newMessage },
        $set: {
          lastMessage: message.trim(),
          lastMessageSender: new ObjectId(senderId),
          updatedAt: new Date(),
        },
        $inc: { unreadMessageCount: 1 }
      }
    );
  
    // Determine receiver ID (opposite of sender)
    const receiverId = chat.clientId.equals(senderId)
      ? chat.therapistId.toString()
      : chat.clientId.toString();
  
    // Emit new message event to both users
    io.to(senderId).emit("new-message", { chatId, message: newMessage });
    io.to(receiverId).emit("new-message", { chatId, message: newMessage });
  
    // Reset unread message count when recipient opens the chat
    socket.on("mark-messages-as-read", async ({ chatId, userId }) => {
      await db.collection("live_chats").updateOne(
        { _id: new ObjectId(chatId) },
        { $set: { unreadMessageCount: 0 } }
      );
    });
  });  

  // End chat
  const endChat = async (chatId, endedBy) => {
    const db = getDb();
    const chat = await db.collection("live_chats").findOneAndUpdate(
      { _id: new ObjectId(chatId) },
      {
        $set: {
          status: "ended",
          endTime: new Date(),
          endedBy: new ObjectId(endedBy)
        }
      }
    );

    // Update therapist status
    await db.collection("users").updateOne(
      { _id: chat.value.therapistId },
      { $set: { status: "online" } }
    );
    io.emit("therapist-status", { 
      userId: chat.value.therapistId.toString(), 
      status: "online" 
    });

    // Clear timer
    if (activeChats.has(chatId.toString())) {
      clearInterval(activeChats.get(chatId.toString()).timer);
      activeChats.delete(chatId.toString());
    }

    io.to(chat.value.clientId.toString()).emit("chat-ended", chat.value);
    io.to(chat.value.therapistId.toString()).emit("chat-ended", chat.value);
  };

  socket.on("end-chat", endChat);

  // Disconnection handler
  socket.on("disconnect", async () => {
    const userId = [...activeUsers.entries()]
      .find(([_, data]) => data.socketId === socket.id)?.[0];

    if (userId) {
      activeUsers.delete(userId);
      
      const db = getDb();
      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $set: { online: false, lastSeen: new Date() } }
      );

      // If therapist, set offline
      const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
      if (user?.role === "therapist") {
        io.emit("therapist-status", { userId, status: "offline" });
      }
    }
  });
});

module.exports = { app, server, io };