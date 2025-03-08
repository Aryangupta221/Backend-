//require('dotenv').config()
import dotenv from "dotenv"
import connectDB from "./db/index.js";
dotenv.config({
    path:'./.env'
})

/*
import express from "express"

;(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("ERRR:",error);
            throw error
            
        })
        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`);
            
        })
    } catch (error) {
        console.log("Error",error);
        throw err
        
        
    }



})()
    */

connectDB()