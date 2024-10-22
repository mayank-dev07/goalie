/**
 * Validates and extracts query parameters from the given URL for creating a challenge.
 *
 * @param {URL} requestUrl - The URL containing the query parameters.
 * @returns {Object} An object containing the validated query parameters:
 * - `truth1` {string}: The first truth statement.
 * - `truth2` {string}: The second truth statement.
 * - `lie` {string}: The lie statement.
 * - `competitors` {number}: The number of competitors, must be a positive number.
 * - `amount` {number}: The amount, must be a positive number.
 *
 * @throws Will throw an error if any of the required query parameters are missing or invalid:
 * - "Invalid input query parameter: truth1" if `truth1` is missing or invalid.
 * - "Invalid input query parameter: truth2" if `truth2` is missing or invalid.
 * - "Invalid input query parameter: lie" if `lie` is missing or invalid.
 * - "Invalid input query parameter: competitors" if `competitors` is missing, not a number, or not a positive number.
 * - "Invalid input query parameter: amount" if `amount` is missing, not a number, or not a positive number.
 */
export function validatedCreateChallengeQueryParams(requestUrl: URL) {
  let truth1: string;
  let truth2: string;
  let lie: string;
  let competitors: number;
  let amount: number;

  try {
    truth1 = requestUrl.searchParams.get("truth1")!;
    if (!truth1) throw "truth1 is required";
  } catch (err) {
    throw "Invalid input query parameter: truth1";
  }

  try {
    truth2 = requestUrl.searchParams.get("truth2")!;
    if (!truth2) throw "truth2 is required";
  } catch (err) {
    throw "Invalid input query parameter: truth2";
  }

  try {
    lie = requestUrl.searchParams.get("lie")!;
    if (!lie) throw "lie is required";
  } catch (err) {
    throw "Invalid input query parameter: lie";
  }

  try {
    competitors = parseInt(requestUrl.searchParams.get("competitors")!);
    if (isNaN(competitors) || competitors <= 0)
      throw "competitors should be a positive number";
  } catch (err) {
    throw "Invalid input query parameter: competitors";
  }

  try {
    amount = parseFloat(requestUrl.searchParams.get("amount")!);
    if (isNaN(amount) || amount <= 0) throw "amount is too small";
  } catch (err) {
    throw "Invalid input query parameter: amount";
  }

  return {
    truth1,
    truth2,
    lie,
    competitors,
    amount,
  };
}

/**
 * Validates and extracts the `challengeId` query parameter from the given URL.
 *
 * @param requestUrl - The URL object containing the query parameters.
 * @returns An object containing the `challengeId`.
 * @throws Will throw an error if the `challengeId` is missing or invalid.
 */
export function validatedChallengeQueryParams(requestUrl: URL) {
  let challengeId: string;
  try {
    challengeId = requestUrl.searchParams.get("challengeId")!;
    if (!challengeId) throw "challengeId is required";
  } catch (err) {
    throw "Invalid input query parameter: challengeId";
  }

  return {
    challengeId,
  };
}

/**
 * Validates and extracts the query parameters from a POST challenge request URL.
 *
 * @param {URL} requestUrl - The URL object containing the query parameters.
 * @returns {{ guess: number, bet: string, challengeId: string }} An object containing the validated `guess`, `bet`, and `challengeId` parameters.
 * @throws Will throw an error if any of the required query parameters are missing or invalid.
 *
 * The function performs the following validations:
 * - `challengeId` must be present.
 * - `guess` must be a number between 0 and 2.
 * - `bet` must be present.
 */
export function validatedPOSTChallengeQueryParams(requestUrl: URL): {
  guess: number;
  bet: string;
  challengeId: string;
} {
  let guess: number;
  let bet: string;
  let challengeId: string;

  try {
    challengeId = requestUrl.searchParams.get("challengeId")!;
    if (!challengeId) throw "challengeId is required";
  } catch (err) {
    throw "Invalid input query parameter: challengeId";
  }

  try {
    guess = parseInt(requestUrl.searchParams.get("guess")!);
    if (isNaN(guess) || guess < 0 || guess > 2)
      throw "guess should be a number between 0 and 2";
  } catch (err) {
    throw "Invalid input query parameter: guess";
  }

  try {
    bet = requestUrl.searchParams.get("bet")!;
    if (!bet) throw "bet is required";
  } catch (err) {
    throw "Invalid input query parameter: bet";
  }

  return {
    guess,
    bet,
    challengeId,
  };
}

/**
 * Shuffles an array of strings in place using the Fisher-Yates algorithm.
 *
 * @param array - The array of strings to shuffle.
 * @returns The shuffled array.
 */
export function shuffleArray(array: string[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
