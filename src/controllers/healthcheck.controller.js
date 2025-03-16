import { apiError } from "../utils/apiError";
import { apiResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asynchandler";

/*
    - This API is meant to check if the service is running properly.
      - If everything is good, we send a response with status "OK".
      - If anything goes wrong we handle the error gracefully
    */
const healthcheck = asyncHandler(async (req, res) => {
  try {
    return res
      .status(200)
      .json(
        new apiResponse(200, { status: "OK" }, "Service is running smoothly")
      );
  } catch (error) {
    throw new apiError(500, "Healthcheck failed. Something went wrong.");
  }
});

export { healthcheck };