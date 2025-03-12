
import { asyncHandler } from "../utils/asynchandler.js";

const registerUser = asyncHandler( async (req,res)=>{
    res.status(200).json({
        message: "hi i am aryan"
    })
})


export {registerUser};
