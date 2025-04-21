import dotenv from "dotenv";
import connectDB from "./db/index.js";
// import app from './app.js'
import { server } from "./app.js";

dotenv.config({ path: ".env" });

const port = process.env.PORT || 6002;
connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log(`Server is running  ,at port ${port}`);
    });
    // app.listen(port,()=>{
    //     console.log(`Server is running 🖥️ ,at port ${port}`);

    // })
  })
  .catch((error) => {
    console.log(`mongobd connection error !!! ${error}`);
  });
