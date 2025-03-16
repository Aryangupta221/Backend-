import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asynchandler.js"



const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    /*
    Step 2: Extract pagination details from query parameters
    - If the client sends ?page=2&limit=5, then:
      - page = 2 (fetch second page of comments)
      - limit = 5 (fetch 5 comments per page)
    - If no values are provided, default to page 1 and limit 10
  */
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
      }
      let pipeline = [
        { $match: { video: new mongoose.Types.ObjectId( videoId ) } },
    ]

    const options = {
        page: parseInt( page ),
        limit: parseInt( limit ),
        customLabels: {
            totalDocs: "total_comments",
            docs: "Comments"
        }
    }

    // 3. use aggregatePaginate to get all comments
    const allCommnets = await Comment.aggregatePaginate( pipeline, options )

    if ( allCommnets?.total_comments === 0 ) { throw new apierror( 400, "Comments not found" ) }

    return res.status( 200 )
        .json( new apiResponse( 200, { "Commnets": allCommnets, "size": allCommnets.length } ) )
} )


const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {content} = req.body
    if(!isValidObjectId(videoId)){
        throw new apiError(500,{},"Invalid VIDEO")
    }
    if ( !content ) { throw new apiError( 400, {}, "Please enter valid comment" ) }
    if (!req.user) {
        throw new apiError(401, "User needs to be logged in");

      }
      if (!content) {
        throw new apiError(400, "Empty or null fields are invalid");
      }
     
    // create comment and save to database
    const comment = await Comment.create({
        content: content,
        video: videoId,
        owner: req.user?.id,
    })
if(!comment){
    throw new apiError(500,"pls write the comment")
}
return res
.status(200)
.json(
    new apiResponse(200, comment,videoId,"Comment added successfull")
)

    // TODO: add a comment to a video
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    const {content} = req.body;

    if(!isValidObjectId(commentId)){
        throw new apiError(400,"invalid comment ID")
    }
    if (!content) {
        throw new ApiError(400, "Comment cannot be empty");
      }
      const updatedComment = await Comment.findOneAndUpdate({
        _id:commentId,
        owner:req.user._id,
      },
      {
        $set:{
            content,
        },
      },
      {new:true}
    )
    if (!updatedComment) {
        throw new apiError(500, "Something went wrong while updating the comment");
      }
    
      /*
        Sending a success response
        - If everything works, return the updated comment with a success message
      */
      return res
        .status(200)
        .json(new apiResponse(200, updatedComment, "Comment successfully updated"));
    
      
    // TODO: update a comment
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    // Check if the commentId is a valid MongoDB ObjectId
    if (!isValidObjectId(commentId)) {
      throw new apiError(400, "Invalid comment ID");
    }
  
    // Check if the user is logged in
    if (!req.user) {
      throw new apiError(401, "User must be logged in");
    }
    const deletedCommentDoc = await Comment.findOneAndDelete({
        _id: commentId,
        owner: req.user._id, // Ensuring only the owner can delete their comment
      });
      if (!deletedCommentDoc) {
        throw new apiError(500, "Something went wrong while deleting the comment");
      }
      return res
    .status(200)
    .json(
      new apiResponse(200, deletedCommentDoc, "Comment deleted successfully")
    );

  
    // TODO: delete a comment
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }