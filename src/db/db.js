import mongoose, { connect } from "mongoose"
import { DB_NAME } from "../constants.js"

const connectDB = async ()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`, {
            family: 4
        });
        
        console.log(`\n MONGoDB Connected on DB HOST ${connectionInstance.connection.host}`);
        
    } catch (error) {
        console.log("MONGoDB Connection ERROR", error);
        process.exit(1)
    }
}

export default connectDB