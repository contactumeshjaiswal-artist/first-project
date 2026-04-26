// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from "./db/db.js";

dotenv.config({
    path: './env'
})

connectDB()

/*

import express from "express"



const app = express()

(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error", (error)=>{
            console.log("error:", error)
            throw error
        })

        app.listen(process.env.PORT, ()=>{console.log(`APP is Listening on the : ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error)
        throw error
    }
})()

    */