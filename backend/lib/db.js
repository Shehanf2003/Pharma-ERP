import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

export const connectDB = async () => {
  try {
    if (process.env.NODE_ENV === 'test' || !process.env.MONGO_URI || process.env.MONGO_URI.includes('localhost')) {
         if (!mongoServer) {
             mongoServer = await MongoMemoryServer.create();
             const uri = mongoServer.getUri();
             console.log(`Using In-Memory MongoDB: ${uri}`);
             const conn = await mongoose.connect(uri);
             console.log(`MongoDB Connected: ${conn.connection.host}`);
             return;
         }
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connection to MongoDB: ${error.message}`);
    // Don't exit process in development/test if connection fails, just log.
    // process.exit(1);
  }
};
