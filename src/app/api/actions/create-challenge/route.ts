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
        href: "/api/actions/create-challenge?vert_set={vert_set}&hor_set={hor_set}&amount={amount}",
        parameters: [
          {
            name: "vert_set",
            label: "(Top, Middle, Bottom)",
            required: true,
            type: "select",
            options: [
              { value: "top", label: "Top" },
              { value: "middle", label: "Middle" },
              { value: "bottom", label: "Bottom" },
            ],
          },
          {
            name: "hor_set",
            label: "(Left, Center, Right)",
            required: true,
            type: "select",
            options: [
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ],
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
      title: "Goalie",
      icon: new URL("/logo.png", requestUrl.origin).toString(),
      description:
        "Create a new challenge for the Goalie game. \nSelect the position where you want to shoot, and let your friend try to block your goal.",
      label: "Create Challenge",
      links: { actions },
    };
    console.log(headers);
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
    const { vert_set, hor_set, amount } =
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
        message: "Create Goalie Challenge",
        links: {
          next: {
            type: "post",
            href: `/api/actions/create-challenge/next-action?vert_set=${vert_set}&hor_set=${hor_set}&amount=${amount}`,
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
