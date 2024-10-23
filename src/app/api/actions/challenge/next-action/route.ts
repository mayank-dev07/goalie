import { addChallenger, getChallenge } from "@/lib/dbUtils";
import {
  calculateGridIndex,
  validatedPOSTChallengeQueryParams,
} from "@/lib/helper";
// import { sendPayouts } from "@/lib/payout.helper";
import {
  createActionHeaders,
  ActionError,
  CompletedAction,
  NextActionPostRequest,
} from "@solana/actions";
import { PublicKey } from "@solana/web3.js";

// Create the standard headers for this route (including CORS)
const headers = createActionHeaders();

/**
 * Handles GET requests.
 * @param req - The request object.
 * @returns A response indicating the method is not supported.
 */
export const GET = async (req: Request) => {
  return Response.json({ message: "Method not supported" }, { headers });
};

/**
 * Handles OPTIONS requests to ensure CORS works.
 * @returns A response with the appropriate headers.
 */
export const OPTIONS = async () => Response.json(null, { headers });

/**
 * Handles POST requests to create a new challenge.
 * @param req - The request object.
 * @returns A response with the result of the challenge creation.
 */
/**
 * Handles the POST request for the next action in a challenge.
 *
 * @param req - The incoming request object.
 * @returns A response object containing the result of the action.
 *
 * @throws Will throw an error if the provided "account" or "signature" is invalid.
 * @throws Will throw an error if fetching the challenge fails.
 * @throws Will throw an error if adding the challenger fails.
 *
 * The function performs the following steps:
 * 1. Validates the query parameters from the request URL.
 * 2. Parses and validates the request body.
 * 3. Fetches the challenge based on the provided challenge ID.
 * 4. Adds the challenger to the challenge.
 * 5. Returns a success response if all steps are completed successfully.
 * 6. Returns an error response if any step fails.
 */
export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const { vert_set, hor_set, bet, challengeId } =
      validatedPOSTChallengeQueryParams(requestUrl);
    const body: NextActionPostRequest = await req.json();

    // Validate the client-provided input
    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      throw 'Invalid "account" provided';
    }

    let signature: string;
    try {
      signature = body.signature!;
      if (!signature) throw "Invalid signature";
    } catch (err) {
      throw 'Invalid "signature" provided';
    }

    let challenge;
    try {
      challenge = await getChallenge(challengeId);
    } catch (err) {
      console.error("Error fetching challenge:", err);
      const actionError: ActionError = { message: "Failed to fetch challenge" };
      return Response.json(actionError, { status: 500, headers });
    }
    if (!challenge) {
      const actionError: ActionError = { message: "Challenge not found" };
      return Response.json(actionError, { status: 404, headers });
    }
    console.log("challenge");
    console.log(vert_set, hor_set, bet, challengeId);

    const gridIndex = calculateGridIndex(vert_set, hor_set) + 1;
    console.log("selected grid", gridIndex);

    try {
      await addChallenger(
        challengeId,
        account.toBase58(),
        signature,
        gridIndex,
        challenge.selectedGrid === gridIndex
      );
    } catch (err) {
      console.error("Error adding challenger:", err);
      const actionError: ActionError = { message: "Failed to add challenger" };
      return Response.json(actionError, { status: 500, headers });
    }
    const payload: CompletedAction = {
      type: "completed",
      title: "Challenge Accepted",
      description: `You have successfully accepted the challenge by ${challenge.wallet}`,
      icon: new URL("/logo.png", requestUrl.origin).toString(),
      label: "Challenge Accepted",
    };

    return Response.json(payload, { headers });
  } catch (err) {
    console.error(err);
    let actionError: ActionError = { message: "An unknown error occurred" };
    if (typeof err == "string") actionError.message = err;
    return Response.json(actionError, {
      status: 400,
      headers,
    });
  }
};
