import mongoose from "mongoose";

const DB_NAME = "ChatApplication";
const connectDB = async () => {
  // console.log(DB_NAME);

  try {
    const connectInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `\n  🛩️  MongoDB connected !! DB HOST:${connectInstance.connection.host}`
    );
  } catch (error) {
    console.log("MONGODB connection Failed", error);
    process.exit(1);
  }
};
export default connectDB;
