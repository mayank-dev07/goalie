import { vaultPublicKey } from "@/lib/constants";
import { getChallenge } from "@/lib/dbUtils";
import {
  validatedChallengeQueryParams,
  validatedPOSTChallengeQueryParams,
} from "@/lib/helper";
import {
  ActionPostResponse,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
  createActionHeaders,
  ActionError,
  LinkedAction,
  CompletedAction,
} from "@solana/actions";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

// create the standard headers for this route (including CORS)
const headers = createActionHeaders();

/**
 * Handles the GET request for fetching and processing a challenge.
 *
 * @param req - The incoming request object.
 * @returns A JSON response containing the challenge details, actions, or an error message.
 *
 * The function performs the following steps:
 * 1. Parses the request URL and validates the challenge query parameters.
 * 2. Attempts to fetch the challenge using the provided challenge ID.
 * 3. If the challenge is not found or an error occurs during fetching, returns an appropriate error response.
 * 4. Checks if the challenge is already completed and returns a completed action response if true.
 * 5. Constructs the available actions for the challenge, including submitting a guess and betting.
 * 6. Returns a JSON response with the challenge details and available actions.
 * 7. Catches and logs any unknown errors, returning a generic error response.
 */
export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const { challengeId } = validatedChallengeQueryParams(requestUrl);

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
    const challenger = challenge.wallet;
    const totalCurrentChallengers =
      challenge.correctGuessesSig.length + challenge.incorrectGuessesSig.length;
    const availableChallengers =
      challenge.maxChallengers - totalCurrentChallengers;
    if (availableChallengers === 0) {
      // just say that challenge is already completed
      const completedAction: CompletedAction = {
        type: "completed",
        title: "Challenge Full",
        description: `The challenge has already reached the maximum number of challengers. Results and rewards will be distributed soon.`,
        icon: new URL("/logo.png", requestUrl.origin).toString(),
        disabled: true,
        label: "Challenge Full",
      };
      return Response.json(completedAction, { headers });
    }
    if (challenge.completedAt !== null) {
      // just say that challenge is already completed
      const completedAction: CompletedAction = {
        type: "completed",
        title: "Challenge Already Completed",
        description: `The challenge has already been completed.\nWinners: ${challenge.correctGuessesSig.join(
          ", "
        )}`,
        icon: new URL("/logo.png", requestUrl.origin).toString(),
        disabled: true,
        label: "Challenge Completed",
      };
      return Response.json(completedAction, { headers });
    }

    const actions: LinkedAction[] = [
      {
        type: "transaction",
        label: "Submit Guess",
        href: `/api/actions/challenge?challengeId=${challengeId}&guess={guess}&bet={bet}`,
        parameters: [
          {
            name: "guess",
            label: "Your Guess",
            required: true,
            type: "radio",
            options: [
              { label: challenge.statements[0], value: "0" },
              { label: challenge.statements[1], value: "1" },
              { label: challenge.statements[2], value: "2" },
            ],
          },
          {
            name: "bet",
            label: "Play or Give Up?",
            required: true,
            type: "radio",
            options: [
              {
                label: `Match Bid: ${
                  challenge.totalAmount / challenge.maxChallengers
                } SOL`,
                value: "play",
              },
              { label: "Give Up", value: "giveup" },
            ],
          },
        ],
      },
    ];
    const payload: ActionGetResponse = {
      type: "action",
      title: "Truth N Lie",
      icon: new URL("/logo.png", requestUrl.origin).toString(),
      description: `Accept the challenge and guess which of the three statements is a lie. Challenged by ${challenger}`,
      label: "Accept Challenge",
      links: { actions },
    };
    return Response.json(payload, { headers });
  } catch (err) {
    console.error(err);
    const actionError: ActionError = { message: "An unknown error occurred" };
    if (typeof err === "string") actionError.message = err;
    return Response.json(actionError, { status: 400, headers });
  }
};

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = async () => Response.json(null, { headers });

export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const body: ActionPostRequest = await req.json();
    const { guess, bet, challengeId } =
      validatedPOSTChallengeQueryParams(requestUrl);

    // Validate the client-provided input
    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      throw 'Invalid "account" provided';
    }

    const connection = new Connection(
      process.env.SOLANA_RPC! || clusterApiUrl("devnet")
    );
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
    let amount_in_lamports: number;

    if (bet === "play") {
      amount_in_lamports =
        (challenge.totalAmount / challenge.maxChallengers) * LAMPORTS_PER_SOL;
    } else {
      amount_in_lamports = 1; // 1 lamport to give up
    }

    // Create an instruction to transfer native SOL from one wallet to vault
    const transferSolInstruction = SystemProgram.transfer({
      fromPubkey: account,
      toPubkey: new PublicKey(vaultPublicKey),
      lamports: amount_in_lamports,
    });

    // Get the latest blockhash and block height
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    const transaction = new Transaction({
      feePayer: account,
      blockhash,
      lastValidBlockHeight,
    }).add(transferSolInstruction);

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: "Create Truth N Lie Challenge",
        links: {
          next: {
            type: "post",
            href: `/api/actions/challenge/next-action?challengeId=${challengeId}&guess=${guess}&bet=${bet}`,
          },
        },
      },
    });

    return Response.json(payload, { headers });
  } catch (err) {
    console.log(err);
    let actionError: ActionError = { message: "An unknown error occurred" };
    if (typeof err == "string") actionError.message = err;
    return Response.json(actionError, {
      status: 400,
      headers,
    });
  }
};
