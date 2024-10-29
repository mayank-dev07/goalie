import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import {
  getAllChallenges,
  getChallenge,
  getTransactionDetails,
  markChallengeAsCompleted,
  transferSolWithKeypair,
} from "./helper";

const platformFee = 0.05;
import wallet from "../keys/ECdDp63uPuG6yWkj7g7kP51JtP2CTcAi2Bn3F21H1nBz.json";

// Function to check if a challenge is full and process payouts
async function checkIfChallengeIsFull() {
  console.log("Checking challenges...");
  //timestamp
  const date = new Date();
  console.log(date);
  try {
    const challenges = await getAllChallenges();
    for (const challenge of challenges) {
      const totalGuesses =
        challenge.correctGuessesSig.length +
        challenge.incorrectGuessesSig.length;
      if (totalGuesses && challenge.completedAt === null) {
        console.log(`Challenge ${challenge.id} is full. Processing payouts...`);
        await sendPayouts(challenge.id);
      }
    }
  } catch (error) {
    console.error("Error checking challenges:", error);
  }
}

// Send payouts for a challenge
export async function sendPayouts(challengeId: string) {
  const connection = new Connection(clusterApiUrl("devnet"));

  let payerPublicKey: PublicKey;
  try {
    const payerKeypair = Keypair.fromSecretKey(new Uint8Array(wallet));
    payerPublicKey = payerKeypair.publicKey;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Invalid payer public key: ${err.message}`);
    } else {
      throw new Error("Invalid payer public key: Unknown error");
    }
  }

  let challenge;
  try {
    challenge = await getChallenge(challengeId);
  } catch (err) {
    console.error("Error fetching challenge:", err);
    throw `Error fetching challenge: ${err}`;
  }

  if (!challenge) {
    throw `No Challenge with ID ${challengeId} found!`;
  }

  for (const winnerSig of challenge.correctGuessesSig) {
    const { sender, receiver, amount } = await getTransactionDetails(winnerSig);

    if (receiver !== payerPublicKey.toString()) {
      throw "Wrong vault account";
    }

    const transferAmount =
      amount === 1
        ? challenge.totalAmount * (1 - platformFee)
        : amount * 2 * (1 - platformFee);

    console.log(
      `Sending ${transferAmount} to winner ${sender} for challenge ${challengeId}`
    );
    await transferSolWithKeypair(
      new PublicKey(sender),
      transferAmount,
      challengeId
    );
  }

  for (const loserSig of challenge.incorrectGuessesSig) {
    const { sender, receiver, amount } = await getTransactionDetails(loserSig);

    if (receiver !== payerPublicKey.toString()) {
      throw "Wrong vault account";
    }

    const transferAmount =
      amount === 1
        ? challenge.totalAmount * (1 - platformFee)
        : amount * 2 * (1 - platformFee);

    console.log(
      `Sending ${transferAmount} to wallet ${challenge.wallet} for challenge ${challengeId}`
    );
    await transferSolWithKeypair(
      new PublicKey(challenge.wallet),
      transferAmount,
      challengeId
    );
  }
  await markChallengeAsCompleted(challengeId);
}

// Run the function every minute
setInterval(checkIfChallengeIsFull, 10000);
