import {asyncHandler} from "../utils/asyncHandler.js"

const registerUser = asyncHandler(async (req, res)=>{
    console.log("Request received!")
    res.status(200).json({
        message: "We are the Best"
    })
})

export {registerUser}