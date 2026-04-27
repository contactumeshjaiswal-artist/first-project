import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// Handling the Form Data
app.use(express.json({limit: "16kb"}))

// Handling URL Data
app.use(express.urlencoded({extended: true, limit: "16kb"}))

// Handling Data Temporarily
app.use(express.static("public"))

// Get and Set Cookie
app.use(cookieParser())

// Routes Import
import userRouter from "./routes/user.routes.js"

// Routes Declaration
// app.use("/users", userRouter)
app.use("/api/v1/users", userRouter)
// http://localhost:8000/api/v1/users/register
export {app}