import {
  Connection,
  clusterApiUrl,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import wallet from "../../keys/ECdDp63uPuG6yWkj7g7kP51JtP2CTcAi2Bn3F21H1nBz.json";
import { getChallenge, initTransaction, updateTransaction } from "./dbUtils";
import { platformFee } from "./constants";

export async function getTransactionDetails(signature: string) {
  // Connect to Solana cluster
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

export async function sendPayouts(challengeId: string) {
  const connection = new Connection(clusterApiUrl("devnet"));
  console.log(connection);

  let payerPublicKey: PublicKey;
  try {
    const payerKeypair = Keypair.fromSecretKey(new Uint8Array(wallet)); // 'wallet' must be a valid Uint8Array secret key
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
  for (const winnerSig of challenge?.correctGuessesSig) {
    const { sender, receiver, amount } = await getTransactionDetails(winnerSig);
    if (receiver != payerPublicKey.toString()) {
      throw "Wrong vault account";
    }
    if (amount == 1) {
      const transferAmount = challenge.totalAmount * (1 - platformFee);
      return await transferSolWithKeypair(
        new PublicKey(challenge.wallet),
        transferAmount,
        challengeId
      );
    }

    const transferAmount = amount * 2 * (1 - platformFee);
    console.log(
      `Sending ${transferAmount} to winner ${sender} for challenge ${challengeId}`
    );
    return await transferSolWithKeypair(
      new PublicKey(sender),
      transferAmount,
      challengeId
    );
  }

  for (const loserSig of challenge?.correctGuessesSig) {
    const { sender, receiver, amount } = await getTransactionDetails(loserSig);
    if (receiver != payerPublicKey.toString()) {
      throw "Wrong vault account";
    }
    if (amount == 1) {
      const transferAmount = challenge.totalAmount * (1 - platformFee);
      return await transferSolWithKeypair(
        new PublicKey(challenge.wallet),
        transferAmount,
        challengeId
      );
    }
    const transferAmount = amount * 2 * (1 - platformFee);
    console.log(
      `Sending ${transferAmount} to winner ${challenge.wallet} for challenge ${challengeId} as challenger ${sender} lost!`
    );
    await transferSolWithKeypair(
      new PublicKey(challenge.wallet),
      transferAmount,
      challengeId
    );
  }
}
