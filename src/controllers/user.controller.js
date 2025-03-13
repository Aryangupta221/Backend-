
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { User } from "../models/User.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

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
   const existedUser  = User.findOne({
     $or: [{email} , {username}]
   })
    if (existedUser) {
        throw new apiError(409,"User with email or username already exists")
        
    }
     const avatarLocalPath = req.files?.avatar[0]?.path;
     const coverImagelocalPath =req.files?.coverImage[0]?.path;
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


export {registerUser};
