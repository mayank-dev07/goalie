import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { db } from "./db";
import wallet from "../keys/ECdDp63uPuG6yWkj7g7kP51JtP2CTcAi2Bn3F21H1nBz.json";

export async function getChallenge(id: string) {
  return db.challenge.findUnique({
    where: {
      id,
    },
  });
}

export async function getTransactionDetails(signature: string) {
  // Connect to Solana cluster
  console.log("signature", signature);

  const connection = new Connection(clusterApiUrl("devnet"), {
    commitment: "confirmed",
  });

  // Fetch transaction
  const transaction = await connection.getTransaction(signature);

  // Check if transaction exists
  if (!transaction) {
    console.error("Transaction not found");
    throw new Error("Transaction not found");
  }

  // Find transfer instruction
  const transferInstruction = transaction.transaction.message.instructions.find(
    (instruction) =>
      transaction.transaction.message.accountKeys[
        instruction.programIdIndex
      ].equals(SystemProgram.programId)
  );

  if (!transferInstruction) {
    console.error("No transfer instruction found in transaction");
    throw new Error("No transfer instruction found in transaction");
  }

  // Extract sender and receiver public keys
  const sender =
    transaction.transaction.message.accountKeys[
      transferInstruction.accounts[0]
    ];
  const receiver =
    transaction.transaction.message.accountKeys[
      transferInstruction.accounts[1]
    ];

  // Extract amount in lamports and convert to SOL
  if (!transaction.meta) {
    console.error("Transaction metadata not found");
    throw new Error("Transaction metadata not found");
  }
  const senderBalanceChange =
    transaction.meta.postBalances[0] - transaction.meta.preBalances[0];
  const receiverBalanceChange =
    transaction.meta.postBalances[1] - transaction.meta.preBalances[1];
  let amount: number = 0; // Initialize amount to 0
  if (senderBalanceChange + transaction.meta.fee === -receiverBalanceChange) {
    amount = receiverBalanceChange / LAMPORTS_PER_SOL;
  } else {
    console.error("Balance changes do not match expected transfer amounts");
    throw new Error("Balance changes do not match expected transfer amounts");
  }

  return {
    sender: sender.toBase58(),
    receiver: receiver.toBase58(),
    amount,
  };
}

async function transferSol(
  sender: Keypair,
  receiver: PublicKey,
  amount: number,
  challengeId: string
) {
  const txid = await initTransaction(
    challengeId,
    sender.publicKey.toString(),
    receiver.toString(),
    amount
  ).then((res) => res.TxID);
  // Connect to Solana cluster
  const connection = new Connection(clusterApiUrl("devnet"));

  // Create an instruction to transfer native SOL from one wallet to another
  const transferSolInstruction = SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    toPubkey: receiver,
    lamports: amount * LAMPORTS_PER_SOL,
  });

  // Get the latest blockhash and block height
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  // Create a transaction
  const transaction = new Transaction({
    feePayer: sender.publicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(transferSolInstruction);

  // Calculate exact fee rate to transfer entire SOL amount out of account minus fees
  const fee =
    (
      await connection.getFeeForMessage(
        transaction.compileMessage(),
        "confirmed"
      )
    ).value || 0;

  transaction.instructions.pop();

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: receiver,
      lamports: amount * LAMPORTS_PER_SOL - fee,
    })
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [
    sender,
  ]);

  const tx = await connection.getTransaction(signature);

  const timestamp = tx?.blockTime || 0;

  await updateTransaction(txid, signature, timestamp);
  console.log(
    `Transfer instruction successful.\nSender:${sender.publicKey.toString()}\nReceiver:${receiver.toString()}\nAmount:${amount}\nSignature:${signature}`
  );
  return signature;
}

export async function transferSolWithKeypair(
  receiver: PublicKey,
  amount: number,
  challengeId: string
) {
  const sender = Keypair.fromSecretKey(new Uint8Array(wallet));

  return transferSol(sender, receiver, amount, challengeId);
}

export function initTransaction(
  challengeId: string,
  sender: string,
  receiver: string,
  amount: number
) {
  return db.transaction.create({
    data: {
      challengeId,
      ToUser: sender,
      TxHash: "",
      FromUser: receiver,
      TokenAmount: amount,
      Token: "SOL",
      TxState: "Pending",
      Timestamp: 0,
    },
  });
}

export function updateTransaction(
  txid: number,
  txHash: string,
  timestamp: number
) {
  return db.transaction.update({
    where: {
      TxID: txid,
    },
    data: {
      TxHash: txHash,
      TxState: "Confirmed",
      Timestamp: timestamp,
    },
  });
}

// Helper function for fetching challenges
export function getAllChallenges() {
  return db.challenge.findMany();
}

export function markChallengeAsCompleted(challengeId: string) {
  console.log(`Marking challenge ${challengeId} as completed...`);
  return db.challenge.update({
    where: {
      id: challengeId,
    },
    data: {
      completedAt: new Date(),
    },
  });
}
