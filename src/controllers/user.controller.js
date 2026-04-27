import {asyncHandler} from "../utils/asyncHandler.js"
import {apiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {apiResponse} from "../utils/apiResponse.js"
import { response } from "express"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshToken = async(userid) =>{
    try {
         const user = await User.findById(userid)
         const userAccessToken = user.generateAccessToken()
         const userRefreshToken = user.generateRefreshToken()

         user.refreshToken = userRefreshToken
         await user.save({ValidateBeforeSave: false})
         
         // ✅ Correct
        return { accessToken: userAccessToken, refreshToken: userRefreshToken }

    } catch (error) {
        throw new apiError(500, "Something went Wrong at Token Generation")
    }
}

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

const loginUser = asyncHandler(async (req, res)=>{
    /*
    req body -> data
    username or email based login
    find the user
    password check
    acccess and refresh token generation 
    send secure cookies
    response of success
    */

    // console.log(req.body)

    const {email, username, password} = req.body

    if(!(username || email)){ throw new apiError(400, "Username or Email is Required")}

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){ throw new apiError(404, "User doesn't Exist")}

    const isPasswordCorrect = await user.isPasswordCorrect(password)

    if(!isPasswordCorrect){ throw new apiError(401, "Invalid Credentials")}

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const userLogged = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(200,
            {
                user: userLogged,accessToken,refreshToken
            }, "User Logged in Succefully"
        )
    )
})

const userLogout = asyncHandler( async(req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,{$set: {refreshToken: undefined}},{ new: true}
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User Logged Out"))
})

const refreshAccessToken = asyncHandler( async (req, res)=>{
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new apiError(401, "Unauthorize Request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new apiError(401, "Invalid Refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new apiError(401, "Expired Refresh Token")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, NewRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", NewRefreshToken, options)
        .json({
            new apiResponse(
                200, 
                {accessToken, refreshToken: NewRefreshToken},
                "AccessTokenRefreshed Successfully"
            )
        })
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid Refresh Token")
    }

})

export {registerUser, loginUser, userLogout, refreshAccessToken}