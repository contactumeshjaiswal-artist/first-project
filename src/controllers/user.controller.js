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

const refreshAccessToken = asyncHandler( async(req, res)=>{
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
        .json(
            new apiResponse(200, 
                {accessToken, refreshToken: NewRefreshToken},
                "AccessTokenRefreshed Successfully"
            )
        )
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid Refresh Token")
    }

})

const changeCurrentPassword = asyncHandler(async (req, res)=>{
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id )
    const checkPassword = await user.isPasswordCorrect(oldPassword)

    if(!checkPassword){ throw new apiError(400, "Invalid Password") }

    user.password = newPassword
    await user.save({ValidateBeforeSave: false})

    return res
    .status(200)
    .json(new apiResponse(200, {}, "Password Changed Successfully"))
})

const getCurrentUser = asyncHandler(async(req, res)=>{
    return res
    .status(200)
    .json(new apiResponse(200, req.user, "Current User Fetched Successfully"))
})

const updateUser = asyncHandler(async(req, res)=>{
    const {fullName, email} = req.body

    if(!(fullName || email)){
        throw new apiError(400, "All fields are Required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new apiResponse(200, user, "Account Details Upadated Successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new apiError(400, "Avatar file is missing")
    }
    const avatarFile = await uploadOnCloudinary(avatarLocalPath)
    
    if(!avatarFile.url){
        throw new apiError(400, "Error while Uploading on Avatar")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,{$set: {avatar: avatarFile.url}},{new: true}).select("-password")

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "Avatar Image Upadated Successfully")
    )
})

const updateUserCover = asyncHandler(async(req,res)=>{
    const coverLocalPath = req.file?.path

    if(!coverLocalPath){
        throw new apiError(400, "Cover file is missing")
    }
    const coverFile = await uploadOnCloudinary(coverLocalPath)
    
    if(!coverFile.url){
        throw new apiError(400, "Error while Uploading on Cover")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,{$set: {coverImage: coverFile.url}},{new: true}).select("-password")

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "Cover Image Upadated Successfully")
    )
})

const getUserChannelProfile = asyncHandler(async(req, res)=>{
    const {username} = req.params
    if(!username?.trim()){
        throw new apiError(400, "Username Missing")
    }
    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localfield: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localfield: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribedCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed:{
                    $cond: {
                        if:{$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                subscribedCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ])
    //  console.log(channel);

    if (!channel?.length) {
        throw new apiError(400, "Channel Doesn't Exists")
    }

    return res
    .status(200)
    .json( new apiResponse(200, channel[0], "User Channel Fetched Successfully"))
})

export {registerUser, loginUser, userLogout, refreshAccessToken,changeCurrentPassword,getCurrentUser,updateUser,updateUserAvatar,updateUserCover}