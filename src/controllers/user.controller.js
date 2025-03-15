
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"
//5 
const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken  = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken,refreshToken}
        
    } catch (error) {
        throw new apiError(500, "Something went wrong while generating refresh and access token")
    }
}
const registerUser = asyncHandler( async (req,res)=>{
    // 1 get user from frontend
    // 2 validation- not empty 
    //3 -check if user already exists 
    //4- upload for images . check for avatar
    //5 -upload them to cloudinary, avatar
    //6- create user object- create entry in db 
    //7-  remove password and refresh token field from response
    //8-check if user is created or not
    //9-return response
//1
    const {fullName,email,username,password}=req.body
    console.log("email:",email);
//2
   if (
    [fullName,email,username,password].some((field)=>
    field?.trim()==="")
   ) {
    throw new apiError(400,"All fields are required")
    
   }
   //3
   const existedUser  =  await User.findOne({
     $or: [{email} , {username}]
   })
    if (existedUser) {
        throw new apiError(409,"User with email or username already exists")
        
    }
    console.log(req.files);
    
     const avatarLocalPath = req.files?.avatar[0]?.path;
     //const coverImagelocalPath =req.files?.coverImage[0]?.path;
     let coverImagelocalPath;
     if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0) {
        coverImagelocalPath = req.files.coverImage[0].path
        
     } 
     if(!avatarLocalPath){
        throw new apiError(400,"avatar file is required")
     }
     //5 -
     const avatar = await uploadOnCloudinary(avatarLocalPath)
     const coverImage =await uploadOnCloudinary(coverImagelocalPath)
     if(!avatar){
        throw new apiError(400,"avatar file is required")

     }
     //6-
     const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase(),
     })
     //7-
     const createdUser =await User.findById(user._id).select(
        "-password -refreshToken"
     )
     //8-
     if(!createdUser){
        throw new apiError(500,"Something went wrong while registering the user")
     }
     //9-
     return res.status(201).json(
        new apiResponse(200,createdUser,"USER REGISTERED SUCCESFULLY")
     )

})
const loginUser = asyncHandler(async(req,res)=>{
    // 1req body -> data
    //2username or email
    //3find the user
    //4password check 
    //5access and refresh token 
    //6send cookie
    //1
    const {email,username,password} = req.body
    //2
    if(!username && !email){
        throw new apiError(400, "username or password is required")
    }
    const user = await User.findOne({
        $or: [{username},{email}]
    })
    //3
    if(!user){
        throw new apiError(404,"User does not exist")

    }
    //4
    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new apiError(401,"Invalid user credentials")

    }
    const {accessToken,refreshToken}= await generateAccessAndRefreshTokens(user._id)
    //7 
    const loggedInuser = await User.findById(user._id).select("-password -refreshToken")

    const options ={
        httpOnly: true,
        secure: true,
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new apiResponse(
            200,
            {
                user:loggedInuser,accessToken,refreshToken
            },
            "User logged in Successfully"
        )
    )
})
const logoutUser  = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options ={
        httpOnly: true,
        secure: true,
       
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new apiResponse(200, {},"User Logged out"))
    
})
const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new apiError((401,"unauthorized request"))
    }
try {
        const  decodedToken =jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
    
        )
        const user =await User.findById(decodedToken?._id)
        if(!user){
            throw new apiError((401,"invalid refresh token "))
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new apiError((401," refresh token is expired or used "))
    
        }
    
        const options={
            httpOnly: true,
            secure:true
        }
        const {accessToken,newrefreshToken}= await generateAccessAndRefreshTokens(user._id)
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newrefreshToken,options)
        .json(
            new apiResponse(
                200,
                {accessToken,refreshToken: newrefreshToken},
                "Access token refreshed "
            )
        )
} catch (error) {
    throw new apiError(401,error?.message|| "invalid refresh token")
    
}
})

export {
    registerUser,
loginUser,
logoutUser,
refreshAccessToken
};
