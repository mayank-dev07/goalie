import { db } from "./db";

/**
 * Creates a user if they do not already exist.
 * @param wallet - The wallet address of the user.
 * @param name - The name of the user.
 * @returns The existing or newly created user.
 */
export async function createUserIfNotExists(wallet: string, name: string) {
  const existingUser = await getUser(wallet);

  if (existingUser) {
    return existingUser;
  }

  return db.user.create({
    data: {
      wallet,
      name,
    },
  });
}

/**
 * Retrieves a user by their wallet address.
 * @param wallet - The wallet address of the user.
 * @returns The user if found, otherwise null.
 */
export async function getUser(wallet: string) {
  return db.user.findUnique({
    where: {
      wallet,
    },
  });
}

/**
 * Creates a new challenge in the database.
 *
 * @param wallet - The wallet address of the user creating the challenge.
 * @param gridIndex - The index of the grid where the challenge is created. Must be between 1 and 9.
 * @param totalAmount - The total amount associated with the challenge.
 * @param createChallengeSig - The signature for creating the challenge.
 * @returns The ID of the created challenge.
 * @throws Will throw an error if the gridIndex is not between 1 and 9.
 */
export async function createChallenge(
  wallet: string,
  gridIndex: number,
  totalAmount: number,
  createChallengeSig: string
) {
  // validations

  if (gridIndex < 1 || gridIndex > 9) {
    throw new Error("gridIndex must be between 0 and 2");
  }

  const existingWallet = await db.user.findUnique({
    where: { wallet },
  });

  if (!existingWallet) {
    await createNewUser(wallet, "User");
  }

  const challenge = await db.challenge.create({
    data: {
      wallet,
      gridIndex,
      totalAmount,
      createChallengeSig,
    },
  });
  return challenge.id;
}

/**
 * Creates a new user in the database without any checks.
 * @param wallet - The wallet address of the user.
 * @param name - The name of the user.
 * @returns The newly created user.
 */
export async function createNewUser(wallet: string, name: string) {
  return db.user.create({
    data: {
      wallet,
      name,
    },
  });
}

/**
 * Retrieves a challenge by its ID.
 * @param id - The ID of the challenge.
 * @returns The challenge if found, otherwise null.
 */
export async function getChallenge(id: string) {
  return db.challenge.findUnique({
    where: {
      id,
    },
  });
}

/**
 * Retrieves all challenges created by a specific user.
 * @param wallet - The wallet address of the user.
 * @returns An array of challenges created by the user.
 */
export async function getChallenges(wallet: string) {
  return db.challenge.findMany({
    where: {
      wallet,
    },
  });
}

/**
 * Retrieves all challenges where a specific user is a challenger.
 * @param wallet - The wallet address of the challenger.
 * @returns An array of challenges where the user is a challenger.
 */
export async function getChallengesByChallenger(wallet: string) {
  return db.challenge.findMany({
    where: {
      challengers: {
        some: {
          wallet,
        },
      },
    },
  });
}

/**
 * Adds a challenger to a challenge and updates their guess.
 * @param challengeId - The ID of the challenge.
 * @param wallet - The wallet address of the challenger.
 * @param guessSignature - The signature of the guess.
 * @param correct - Whether the guess was correct.
 * @returns The updated challenge.
 */
export async function addChallenger(
  challengeId: string,
  wallet: string,
  guessSignature: string,
  selected: number,
  correct: boolean
) {
  console.log(correct, "correct");

  const existingWallet = await db.user.findUnique({
    where: { wallet },
  });

  if (!existingWallet) {
    await createNewUser(wallet, "User");
  }
  return db.challenge.update({
    where: {
      id: challengeId,
    },
    data: {
      challengers: {
        connect: {
          wallet,
        },
      },
      selectedGrid: selected,
      [correct ? "correctGuessesSig" : "incorrectGuessesSig"]: {
        push: guessSignature,
      },
    },
  });
}

export function markChallengeAsComplete(challengeId: string) {
  return db.challenge.update({
    where: {
      id: challengeId,
    },
    data: {
      completedAt: new Date(),
    },
  });
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

export function getAllChallenges() {
  return db.challenge.findMany();
}
