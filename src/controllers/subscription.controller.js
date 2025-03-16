import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { asyncHandler } from "../utils/asynchandler.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const subscriberId = req.user._id;
  
    if (!isValidObjectId(channelId)) {
      throw new apiError(400, "Invalid channel ID");
    }
  
    if (subscriberId.toString() === channelId.toString()) {
      throw new apiError(400, "You cannot subscribe to your own channel");
    }
  
    const existingSubscription = await Subscription.findOne({
      subscriber: subscriberId,
      channel: channelId,
    });
  
    if (existingSubscription) {
      await Subscription.findByIdAndDelete(existingSubscription._id);
      return res.status(200).json(new apiResponse(200, {}, "Unsubscribed successfully"));
    }
  
    await Subscription.create({ subscriber: subscriberId, channel: channelId });
    return res.status(201).json(new apiResponse(201, {}, "Subscribed successfully"));
  });
  
  const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const channelId = req.user._id;
  
    if (!isValidObjectId(channelId)) {
      throw new apiError(400, "Invalid channel ID");
    }
  
    const subscribersDocs = await Subscription.find({
      channel: channelId,
    }).populate("subscriber", "_id name email");
  
    if (!subscribersDocs) {
      throw new apiError(404, "No subscribers found for this channel");
    }
  
    return res.status(200).json(new apiResponse(200, subscribersDocs, "Subscribers fetched successfully"));
  });
  
  const getSubscribedChannels = asyncHandler(async (req, res) => {
    const subscriberId = req.user._id;
  
    const subscribedChannels = await Subscription.find({
      subscriber: subscriberId,
    }).populate("channel", "_id name email");
  
    if (!subscribedChannels || subscribedChannels.length === 0) {
      throw new apiError(404, "No subscribed channels found");
    }
  
    return res.status(200).json(
      new apiResponse(200, subscribedChannels, "Subscribed channels fetched successfully")
    );
  });
  
  export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
  