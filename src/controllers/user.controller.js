import {asyncHandler} from "../utils/asyncHandler.js"
import {apiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {apiResponse} from "../utils/apiResonse.js"
import { response } from "express"

const registerUser = asyncHandler(async (req, res)=>{
    // get user details from frontend
    // validation not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res (response)

    const {username, password, email, fullName} = req.body
    console.log("username is : ", username)
    console.log("email is : ", email)
    console.log("fullName is : ", fullName)

    // if(fullName === ""){
    //     throw new apiError(400, "fullName is Required")
    // }

    if(
        [username, password, email, fullName].some((field)=>field?.trim() == "" )
    ){
        throw new apiError(400, "fullName is Required") 
    }
    
    // Checking the Existing Entry to Avoid Duplicacy
    const existingUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existingUser){throw new apiError(409, "User with Email or Username Already Exists")}

    // Handling Files
    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImgLocalPath = req.files?.coverImage[0]?.path

    let coverImgLocalPath
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImgLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){throw new apiError(400, "Avatar file is Required")}

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImgLocalPath)

    if(!avatar){throw new apiError(400, "Avatar file is Required")}

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){ throw new apiError(500, "Something went Wrong white Registering a User")}

    return res.status(201).json(
        new apiResponse(200, createdUser, "User Registered Successfully")
    )

})

export {registerUser}