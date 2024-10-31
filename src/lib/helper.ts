export function validatedCreateChallengeQueryParams(requestUrl: URL) {
  let vert_set: string;
  let hor_set: string;
  let amount: number;

  try {
    vert_set = requestUrl.searchParams.get("vert_set")!;
    if (!vert_set) throw "vert_set is required";
  } catch (err) {
    console.log(err);

    throw "Invalid input query parameter: vert_set";
  }

  try {
    hor_set = requestUrl.searchParams.get("hor_set")!;
    if (!hor_set) throw "hor_set is required";
  } catch (err) {
    console.log(err);

    throw "Invalid input query parameter: hor_set";
  }

  try {
    amount = parseFloat(requestUrl.searchParams.get("amount")!);
    if (isNaN(amount) || amount <= 0) throw "amount is too small";
  } catch (err) {
    console.log(err);

    throw "Invalid input query parameter: amount";
  }

  return {
    vert_set,
    hor_set,
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
    console.log(err);

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
  vert_set: string;
  hor_set: string;
  bet: string;
  challengeId: string;
} {
  let vert_set: string;
  let hor_set: string;
  let bet: string;
  let challengeId: string;

  try {
    challengeId = requestUrl.searchParams.get("challengeId")!;
    if (!challengeId) throw "challengeId is required";
  } catch (err) {
    console.log(err);

    throw "Invalid input query parameter: challengeId";
  }

  try {
    vert_set = requestUrl.searchParams.get("vert_set")!;
    if (!vert_set) throw "vert_set is required";
  } catch (err) {
    console.log(err);

    throw "Invalid input query parameter: vert_set";
  }

  try {
    hor_set = requestUrl.searchParams.get("hor_set")!;
    if (!hor_set) throw "hor_set is required";
  } catch (err) {
    console.log(err);

    throw "Invalid input query parameter: hor_set";
  }
  try {
    bet = requestUrl.searchParams.get("bet")!;
    if (!bet) throw "bet is required";
  } catch (err) {
    console.log(err);

    throw "Invalid input query parameter: bet";
  }

  return {
    vert_set,
    hor_set,
    bet,
    challengeId,
  };
}

/**
 * Calculates the grid index based on the provided vertical and horizontal sets.
 *
 * @param vert_set - The vertical position, which can be 'top', 'middle', or 'bottom'.
 * @param hor_set - The horizontal position, which can be 'left', 'middle', or 'right'.
 * @returns The calculated grid index as a number.
 */
export function calculateGridIndex(vert_set: string, hor_set: string): number {
  const verticalMap: { [key: string]: number } = {
    top: 0,
    middle: 1,
    bottom: 2,
  };

  const horizontalMap: { [key: string]: number } = {
    left: 0,
    center: 1,
    right: 2,
  };

  const verticalIndex = verticalMap[vert_set.toLowerCase()];
  const horizontalIndex = horizontalMap[hor_set.toLowerCase()];

  // console.log("verticalIndex", verticalIndex * 3 + horizontalIndex);

  return verticalIndex * 3 + horizontalIndex;
}
