import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn("MONGODB_URI not found in environment variables. Skipped MongoDB connection.");
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'shopify'
    });
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};

export default connectDB;
