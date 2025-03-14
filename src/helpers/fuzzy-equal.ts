import {
  type FuzzyEqualComparison,
} from '../types/index.js';

/*+
 * Calculate the total similarity from the fuzzy equal comparison results.
 */
function getTotalSimilarity(fuzzyEqualResult: FuzzyEqualComparison[]) {
  const accumulator = {propertyCount: 0, matching: 0};

  for (const result of fuzzyEqualResult) {
    accumulator.matching += result.matching;
    accumulator.propertyCount += result.propertyCount;
  }

  return accumulator;
}

/**
 * Compare two literals for similarity.
 *
 * @param lhs
 * @param rhs
 */
function compareLiterals(lhs: any, rhs: any): [FuzzyEqualComparison, [any, any]] {
  if (lhs === rhs) {
    return [
      {
        propertyCount: 1,
        matching: 1,
      },
      [undefined, undefined],
    ];
  }

  return [
    {
      propertyCount: 1,
      matching: 0,
    },
    [undefined, undefined],
  ];
}

/**
 * Compare two arrays for similarity.
 *
 * @param lhs
 * @param rhs
 */
function compareArrays(lhs: any[], rhs: any[]): [FuzzyEqualComparison[], Array<[any, any]>] {
  const matchResult: FuzzyEqualComparison[] = [];
  const leftRightComparison: Array<[any, any]> = [];
  const length = Math.max(lhs.length, rhs.length);

  for (let i = 0; i < length; i++) {
    if (i in lhs && i in rhs) {
      leftRightComparison.push([lhs[i], rhs[i]]);
    } else {
      matchResult.push({propertyCount: 1, matching: 0});
    }
  }

  return [matchResult, leftRightComparison];
}

/**
 * Compare two objects for similarity.
 *
 * @param lhs
 * @param rhs
 */
function compareObjects(lhs: any, rhs: any): [FuzzyEqualComparison[], Array<[any, any]>] {
  const matchResult: FuzzyEqualComparison[] = [];
  const leftRightComparison: Array<[any, any]> = [];
  const matchingProperties: Record<string, boolean> = {};

  for (const property in lhs) {
    if (property in rhs) {
      matchingProperties[property] = true;
      leftRightComparison.push([lhs[property], rhs[property]]);
    } else {
      matchResult.push({propertyCount: 1, matching: 0});
    }
  }

  for (const rprop in rhs) {
    if (rprop in matchingProperties) {
      continue;
    }

    matchResult.push({propertyCount: 1, matching: 0});
  }

  return [matchResult, leftRightComparison];
}

/**
 * Compare two objects for similarity.
 * Inspired and enhanced from https://github.com/hath995/fuzzyEqual
 *
 * @param lhsInput
 * @param rhsInput
 * @param propertyThreshold
 */
export function fuzzyEqual(lhsInput: any, rhsInput: any, propertyThreshold = Infinity): FuzzyEqualComparison {
  const leftRightComparisons: Array<[any, any]> = [[lhsInput, rhsInput]];
  let matchResults: FuzzyEqualComparison = {propertyCount: 0, matching: 0};

  while (leftRightComparisons.length > 0 && matchResults.propertyCount < propertyThreshold) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [lhs, rhs] = leftRightComparisons.shift() ?? [undefined, undefined];
    const lhsType = typeof lhs;
    const rhsType = typeof rhs;
    const lhsIsArray = Array.isArray(lhs);
    const rhsIsArray = Array.isArray(rhs);
    const lhsIsObject = lhsType === 'object';
    const rhsIsObject = rhsType === 'object';
    const lhsIsNull = lhs === null;
    const rhsIsNull = rhs === null;
    const bothNotObjects = (lhsType !== 'object') && (rhsType !== 'object');

    if (lhsType === rhsType && bothNotObjects) {
      const [matchResult, _] = compareLiterals(lhs, rhs);
      matchResults = getTotalSimilarity([matchResults, matchResult]);
    } else if (lhsType === rhsType) {
      if (lhsIsNull) {
        const [matchResult, _] = compareLiterals(lhs, rhs);
        matchResults = getTotalSimilarity([matchResults, matchResult]);
      } else if (lhsIsArray && rhsIsArray) {
        const [matchResult, leftRightComparison] = compareArrays(lhs, rhs);
        leftRightComparisons.push(...leftRightComparison);
        matchResults = getTotalSimilarity([matchResults, ...matchResult]);
      } else if (lhsIsObject && rhsIsObject) {
        const [matchResult, leftRightComparison] = compareObjects(lhs, rhs);
        leftRightComparisons.push(...leftRightComparison);
        matchResults = getTotalSimilarity([matchResults, ...matchResult]);
      }
    } else if (lhsIsNull || rhsIsNull) {
      const [matchResult, _] = compareLiterals(lhs, rhs);
      matchResults = getTotalSimilarity([matchResults, matchResult]);
    } else {
      matchResults = getTotalSimilarity([matchResults, {propertyCount: 1, matching: 0}]);
    }
  }

  return matchResults;
}
