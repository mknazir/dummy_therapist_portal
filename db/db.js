const { MongoClient } = require("mongodb");
const env = require("dotenv");
env.config();

const uri = process.env.DATABASE;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let db;
const collections = ['users','admin','appointments' ,'groupSessions' ,'sessionNotes' , 'referrals', 'selftherapy' , 'supervision','payments', 'notifications','coupons','concerns','counters' , "live_chats"]; 
const connectToDatabase = async () => {
  try {
    await client.connect();
    db = client.db(process.env.DB_NAME);
    console.log("Connected to database");
    await Promise.all(
      collections.map(async (collectionName) => {
        const collection = await db
          .listCollections({ name: collectionName })
          .toArray();
        if (collection.length === 0) {
          await db.createCollection(collectionName);
          console.log(`Created collection: ${collectionName}`);
        }
      })
    );
  } catch (err) {
    console.error(err);
  }
};

const getDb = () => db;

module.exports = { connectToDatabase, getDb };
