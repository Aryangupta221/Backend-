import mongoose ,{Schema}from "mongoose";

const subscriptionSchema  = new Schema({
    subscriber:{
        type: Schema.Types.ObjectId,//pne who is subscribing
        ref:"User"
    },
    channel:{
        type: Schema.Types.ObjectId,//pne to whom subscriber is subscribing
        ref:"User"
        
    }

},{timestamps:true})

export const Subscription  = mongoose.model("Subscription",subscriptionSchema)

