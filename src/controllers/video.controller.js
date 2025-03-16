import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudnary.js"
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";

////////// Get all videos //////////
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = 1, userId = "" } = req.query

    let pipeline = [
        {
            $match: {
                $and: [
                    {
                        $or: [
                            { title: { $regex: query, $options: "i" } },
                            { description: { $regex: query, $options: "i" } }
                        ]
                    },
                    ...(userId ? [{ Owner: new mongoose.Types.ObjectId(userId) }] : "")
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "Owner",
                foreignField: "_id",
                as: "Owner",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            avatar: "$avatar.url",
                            username: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                Owner: {
                    $first: "$Owner",
                },
            },
        },
        {
            $sort: { [sortBy]: sortType }
        }
    ];

    try {
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            customLabels: {
                totalDocs: "totalVideos",
                docs: "videos",
            },
        };

        const result = await Video.aggregatePaginate(Video.aggregate(pipeline), options);

        if (result?.videos?.length === 0) {
            return res.status(404).json(new apiResponse(404, {}, "No Videos Found"));
        }

        return res.status(200).json(new apiResponse(200, result, "Videos fetched successfully"));

    } catch (error) {
        console.error(error.message);
        return res.status(500).json(new apiError(500, {}, "Internal server error in video aggregation"));
    }
});

////////// Publish a video //////////
const publishAVideo = asyncHandler(async (req, res) => {
    try {
        const { title, description } = req.body
        if ([title, description].some((field) => field.trim() === "")) {
            throw new apiError(400, "Please provide all details");
        }

        const videoLocalPath = req.files?.videoFile[0]?.path
        const thumbnailLocalPath = req.files?.thumbnail[0]?.path

        if (!videoLocalPath) { throw new apiError(400, "Please upload video"); }
        if (!thumbnailLocalPath) { throw new apiError(400, "Please upload thumbnail"); }

        const videoOnCloudinary = await uploadOnCloudinary(videoLocalPath, "video")
        const thumbnailOnCloudinary = await uploadOnCloudinary(thumbnailLocalPath, "img")

        if (!videoOnCloudinary) { throw new apiError(400, "Video uploading failed"); }
        if (!thumbnailOnCloudinary) { throw new apiError(400, "Thumbnail uploading failed"); }

        const video = await Video.create({
            title: title,
            description: description,
            thumbnail: thumbnailOnCloudinary?.url,
            videoFile: videoOnCloudinary?.url,
            duration: videoOnCloudinary?.duration,
            isPublished: true,
            Owner: req.user?._id
        });

        if (!video) { throw new apiError(400, "Video uploading failed"); }

        return res.status(201).json(new apiResponse(201, video, "Video Uploaded successfully"));

    } catch (error) {
        return res.status(501).json(new apiError(501, {}, "Problem in uploading video"));
    }
});

////////// Get a video by id //////////
const getVideoById = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params

        if (!isValidObjectId(videoId)) { throw new apiError(400, "Invalid VideoID"); }

        const video = await Video.findById(videoId)

        if (!video) { throw new apiError(400, "Failed to get Video details."); }

        return res.status(200).json(new apiResponse(200, video, "Video found"));

    } catch (error) {
        res.status(501).json(new apiError(501, {}, "Video not found"));
    }
});

////////// Update a video //////////
const updateVideo = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        if (!isValidObjectId(videoId)) { throw new apiError(400, "Invalid VideoID"); }

        const { title, description } = req.body
        if ([title, description].some((field) => field.trim() === "")) {
            throw new apiError(400, "Please provide title, description, thumbnail");
        }

        const video = await Video.findById(videoId)
        if (!video) { throw new apiError(400, "Video not found"); }

        if (!video.Owner.equals(req.user._id)) {
            throw new apiError(400, {}, "You can't update this video");
        }

        const thumbnailLocalPath = req.file?.path
        if (!thumbnailLocalPath) { throw new apiError(400, "Thumbnail not found"); }

        const thumbnailOnCloudinary = await uploadOnCloudinary(thumbnailLocalPath, "img")
        if (!thumbnailOnCloudinary) { throw new apiError(400, "Thumbnail not uploaded on cloudinary"); }

        const deleteThumbnailOldUrl = await deleteFromCloudinary(video?.thumbnail, "img")
        if (!deleteThumbnailOldUrl) { throw new apiError(400, "Thumbnail not deleted"); }

        video.title = title
        video.description = description
        video.thumbnail = thumbnailOnCloudinary.url
        await video.save()

        return res.status(200).json(new apiResponse(200, video, "Video details updated successfully"));

    } catch (error) {
        console.log(error.stack)
        return res.status(500).json(new apiError(500, {}, "Video not updated"));
    }
});

////////// Delete a video //////////
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) { throw new apiError(400, "Invalid VideoID"); }

    const video = await Video.findById(videoId)
    if (!video) { throw new apiError(400, "Invalid Video"); }

    if (!video.Owner.equals(req.user._id)) {
        throw new apiError(403, "You are not authorized to delete this video");
    }

    const videoFile = await deleteFromCloudinary(video.videoFile, "video")
    const thumbnail = await deleteFromCloudinary(video.thumbnail, "img")

    if (!videoFile && !thumbnail) { throw new apiError(400, "Thumbnail or videoFile is not deleted from cloudinary"); }

    await video.remove();

    return res.status(200).json(new apiResponse(200, {}, "Video Deleted successfully"));
});

////////// Toggle publish status of a video //////////
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) { throw new apiError(400, "Invalid VideoID"); }

    const toggleisPublished = await Video.findOne({
        _id: videoId,
        Owner: req.user._id,
    });

    if (!toggleisPublished) { throw new apiError(400, "Invalid Video or Owner"); }

    toggleisPublished.isPublished = !toggleisPublished.isPublished
    await toggleisPublished.save()

    return res.status(200).json(new apiResponse(200, toggleisPublished.isPublished, "isPublished toggled successfully"));
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
};
