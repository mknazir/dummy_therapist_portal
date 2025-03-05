const { getDb } = require("../db/db");

const getNextSerialNumber = async (type) => {
  const db = getDb();
  const counterCollection = db.collection("counters");

  const counter = await counterCollection.findOneAndUpdate(
    { type },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", returnNewDocument: true }
  );

  const newSeq = counter.seq ? counter.seq : 1;

  const prefix = type === "user_serial" ? "USR" : "APT";
  return `${prefix}${String(newSeq).padStart(5, "0")}`;
};

module.exports = { getNextSerialNumber };