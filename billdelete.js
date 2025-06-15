import Bill from "./models/bill-model.js";
import mongoose from "mongoose";
import { connectDB } from "./utils/db.js";

async function deleteBills() {
  await connectDB();
  // Get the _id values of bills to delete (skip first 100)
  const billsToDelete = await Bill.find({}, { _id: 1 }).skip(100);
  const idsToDelete = billsToDelete.map(doc => doc._id);

  // Delete the bills with those _ids
  await Bill.deleteMany({ _id: { $in: idsToDelete } });
  console.log("Bills deleted.");
  mongoose.connection.close();
}

deleteBills();
