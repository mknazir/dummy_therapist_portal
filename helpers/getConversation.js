
const { ObjectId } = require('mongodb');
const { getDb } = require('../db/db'); // Assuming you have a `getDb` function that returns the MongoDB connection
const crypto = require('crypto');

const getConversation = async (currentUserId) => {
    if (currentUserId) {
        const db = getDb();
        const currentUserConversation = await db.collection('conversations').aggregate([
            {
                $match: {
                    $or: [
                        { sender: new ObjectId(currentUserId) },
                        { receiver: new ObjectId(currentUserId) }
                    ]
                }
            },
            {
                $sort: { updatedAt: -1 }
            },
            {
                $lookup: {
                    from: 'messages',
                    localField: 'messages',
                    foreignField: '_id',
                    as: 'messages'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'sender',
                    foreignField: '_id',
                    as: 'sender'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'receiver',
                    foreignField: '_id',
                    as: 'receiver'
                }
            },
            {
                $unwind: "$sender"
            },
            {
                $unwind: "$receiver"
            }
        ]).toArray();

        const conversation = currentUserConversation.map((conv) => {
            const countUnseenMsg = conv.messages.reduce((prev, curr) => {
                const msgByUserId = curr.msgByUserId.toString();

                return msgByUserId !== currentUserId ? prev + (curr.seen ? 0 : 1) : prev;
            }, 0);

            return {
                _id: conv._id,
                sender: conv.sender,
                receiver: conv.receiver,
                unseenMsg: countUnseenMsg,
                lastMsg: conv.messages[conv.messages.length - 1]
            };
        });

        return conversation;
    } else {
        return [];
    }
};

const generateWalletId = () => {
  // Generate a random string using crypto and concatenate with "wallet_"
  return "wallet_" + crypto.randomBytes(8).toString("hex"); // Generates a unique 16-character hex string
};

module.exports = {getConversation , generateWalletId};
