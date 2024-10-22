import { vaultPublicKey } from "@/lib/constants";
import { validatedCreateChallengeQueryParams } from "@/lib/helper";
import {
  ActionPostResponse,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
  createActionHeaders,
  ActionError,
  LinkedAction,
} from "@solana/actions";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

// Create the standard headers for this route (including CORS)
const headers = createActionHeaders();

/**
 * Handles GET requests to provide metadata for creating a challenge.
 * @param req - The incoming request object.
 * @returns A JSON response containing action metadata.
 */
export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const actions: LinkedAction[] = [
      {
        type: "transaction",
        label: "Create Challenge",
        href: "/api/actions/create-challenge?truth1={truth1}&truth2={truth2}&lie={lie}&competitors={competitors}&amount={amount}",
        parameters: [
          { name: "truth1", label: "Truth 1", required: true, type: "text" },
          { name: "truth2", label: "Truth 2", required: true, type: "text" },
          { name: "lie", label: "Lie", required: true, type: "text" },
          {
            name: "competitors",
            label: "Total Competitors",
            required: true,
            type: "number",
          },
          {
            name: "amount",
            label: "Bet Amount (in SOL)",
            required: true,
            type: "number",
          },
        ],
      },
    ];
    const payload: ActionGetResponse = {
      type: "action",
      title: "Truth N Lie",
      icon: new URL("/logo.png", requestUrl.origin).toString(),
      description:
        "Create a new challenge for the 2 Truths and 1 Lie game. \nProvide two truths and one lie, and let your friend guess which one is the lie.",
      label: "Create Challenge",
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

/**
 * Handles OPTIONS requests to ensure CORS works for blinks.
 * @returns A JSON response with standard headers.
 */
export const OPTIONS = async () => Response.json(null, { headers });

/**
 * Handles POST requests to create a new challenge.
 * @param req - The incoming request object.
 * @returns A JSON response containing the transaction details.
 */
export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const { truth1, truth2, lie, competitors, amount } =
      validatedCreateChallengeQueryParams(requestUrl);
    const body: ActionPostRequest = await req.json();

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

    // Create an instruction to transfer native SOL from one wallet to vault
    const transferSolInstruction = SystemProgram.transfer({
      fromPubkey: account,
      toPubkey: new PublicKey(vaultPublicKey),
      lamports: amount * LAMPORTS_PER_SOL,
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
            href: `/api/actions/create-challenge/next-action?truth1=${truth1}&truth2=${truth2}&lie=${lie}&amount=${amount}&competitors=${competitors}`,
          },
        },
      },
    });

    return Response.json(payload, { headers });
  } catch (err) {
    console.error(err);
    const actionError: ActionError = { message: "An unknown error occurred" };
    if (typeof err === "string") actionError.message = err;
    return Response.json(actionError, { status: 400, headers });
  }
};
