import {
  deepEqual,
} from 'fast-equals';
import {
  sort,
} from 'fast-sort';
import {
  type BaseComparator,
  type BaseComparisonResult,
  type FuzzyEqualComparison,
  type FuzzyEqualSimilarity,
  type NextBestMatchTracker,
  type NodeInput,
  type PerfectMatchTracker,
} from '../types/index.js';
import {
  hashObjectLoosely,
  fuzzyEqual,
  mapIntervalToNumber,
  getDefaultValueOfNextBestMatchTracker,
} from '../helpers/index.js';
import {
  NextBestFitHub,
} from './workers/index.js';

type Options = {
  nextBestMatchThreshold: number;
  threads: number;
};

export class ObjectComparator<T extends NodeInput> implements BaseComparator<T, BaseComparisonResult, Options> {
  /**
   * Stores the current nodes to compare.
   */
  private currentValues: T[] = [];

  /**
   * Stores the current nodes that have been used in a perfect match.
   */
  private readonly usedCurrentValueNodeIds = new Set<number>();

  /**
   * Stores the next nodes to compare.
   */
  private nextValues: T[] = [];

  /**
   * Stores the next nodes that have been used in a perfect match.
   */
  private readonly usedNextValueNodeIds = new Set<number>();

  /**
   * Threshold for next best match.
   */
  private threshold = 0.7;

  /**
   * Amount of threads for parallel next best check.
   */
  private threads = 1;

  /**
   * Stores the comparison results.
   */
  private readonly results: BaseComparisonResult = {
    perfectMatchNodes: new Map<string, PerfectMatchTracker>(),
    nextBestMatchNodes: getDefaultValueOfNextBestMatchTracker(),
    disjunctNodes: {
      currentNodeId: new Set<number>(),
      nextNodeId: new Set<number>(),
    },
  };

  /**
   * @inheritdoc
   */
  public initialize(currentValues: T[], nextValues: T[], options: Options): void {
    this.currentValues = currentValues;
    this.nextValues = nextValues;
    this.threshold = options.nextBestMatchThreshold;
    this.threads = options.threads;
  }

  /**
   * @inheritdoc
   */
  public async compare(): Promise<BaseComparisonResult> {
    console.log('Starting perfect match search for objects');
    let currentValuesLength = this.currentValues.length;
    for (const [i, value] of this.currentValues.entries()) {
      this.findPerfectMatch(value);

      if (i % 2500 === 0) {
        this.debug();
        console.log(`Progress: ${(i / currentValuesLength * 100).toFixed(2)}%`);
      }
    }

    this.debug();
    console.log('Finished perfect match search for objects');
    console.log('Starting next best match search for objects');
    currentValuesLength = this.currentValues.length;
    let bestMatches = [];
    const filteredCurrentValues = this.currentValues.filter(value => !this.usedCurrentValueNodeIds.has(value.nodeId));
    const filteredNextValues = this.nextValues.filter(value => !this.usedNextValueNodeIds.has(value.nodeId));
    if (this.threads <= 1) {
      for (const [i, value] of filteredCurrentValues.entries()) {
        bestMatches.push(...this.findNextBestMatches(value, filteredNextValues));

        if (i % 2500 === 0) {
          this.debug();
          console.log(`Progress: ${(i / currentValuesLength * 100).toFixed(2)}%`);
        }
      }
    } else {
      const bestMatchesHub = new NextBestFitHub(filteredCurrentValues, filteredNextValues, {threads: this.threads, threshold: this.threshold});
      bestMatches = await bestMatchesHub.runComparison();
    }

    console.log('Finished aggregation of matches for objects');
    this.selectNextBestMatches(bestMatches);
    console.log('Finished next best match search for objects');

    this.fillDisjunctNodes();
    this.debug();
    return this.results;
  }

  /**
   * Finds 1:1 matches with current and next nodes and removes them from the values.
   *
   * @param currentValue
   * @returns indicator whether perfect match was found
   */
  private findPerfectMatch(currentValue: NodeInput): boolean {
    const perfectMatch = this.nextValues.find(nextValue => {
      if (this.usedNextValueNodeIds.has(nextValue.nodeId)) {
        return false;
      }

      try {
        return deepEqual(currentValue.node.obj, nextValue.node.obj);
      } catch {
        return false;
      }
    });

    if (perfectMatch) {
      const valueHash = hashObjectLoosely(currentValue.node.obj);
      const aggregatorReference = this.results.perfectMatchNodes.get(valueHash) ?? {
        currentNodeId: new Set<number>(),
        nextNodeId: new Set<number>(),
      };

      aggregatorReference.currentNodeId.add(currentValue.nodeId);
      aggregatorReference.nextNodeId.add(perfectMatch.nodeId);
      this.results.perfectMatchNodes.set(valueHash, aggregatorReference);
      this.usedCurrentValueNodeIds.add(currentValue.nodeId);
      this.usedNextValueNodeIds.add(perfectMatch.nodeId);
      return true;
    }

    return false;
  }

  /**
   * Finds all next best matches for the current value in regard to the threshold.
   *
   * @param currentValue
   */
  private findNextBestMatches(currentValue: NodeInput, nextValues: NodeInput[]): FuzzyEqualSimilarity[] {
    return nextValues.map(nextValue => {
      if (this.usedNextValueNodeIds.has(nextValue.nodeId)) {
        return {similarity: 0, currentValueNodeId: 0, nextValueNodeId: 0};
      }

      try {
        const totalSimilarity: FuzzyEqualComparison = fuzzyEqual(currentValue.node.obj, nextValue.node.obj);
        if (totalSimilarity.propertyCount === 0) {
          return {similarity: 0, currentValueNodeId: currentValue.nodeId, nextValueNodeId: nextValue.nodeId};
        }

        return {similarity: totalSimilarity.matching / totalSimilarity.propertyCount, currentValueNodeId: currentValue.nodeId, nextValueNodeId: nextValue.nodeId};
      } catch (error) {
        console.log('Incomparable Inputs', error, currentValue.nodeId, nextValue.nodeId);
        return {similarity: 0, currentValueNodeId: currentValue.nodeId, nextValueNodeId: nextValue.nodeId};
      }
    }).filter(nextBestMatch => nextBestMatch.similarity >= this.threshold);
  }

  /**
   * Selects the next best matches and removes them from the values and tracks selected nodes.
   *
   * @param matches
   */
  private selectNextBestMatches(matches: FuzzyEqualSimilarity[]): void {
    const descendingSortedMatches = sort(matches).desc(match => match.similarity);
    const usedCurrentNodes = new Set<number>();
    const usedNextNodes = new Set<number>();

    for (const nextBestMatch of descendingSortedMatches) {
      const currentValue = this.currentValues.find(_currentValue => _currentValue.nodeId === nextBestMatch.currentValueNodeId);
      if ((usedCurrentNodes.has(nextBestMatch.currentValueNodeId) || usedNextNodes.has(nextBestMatch.nextValueNodeId)) || !currentValue) {
        continue;
      }

      const similarity = mapIntervalToNumber((nextBestMatch?.similarity ?? 0) * 100);
      this.results.nextBestMatchNodes[similarity] ??= new Map();
      const similarityAggregatorReference = this.results.nextBestMatchNodes[similarity];

      const valueHash = hashObjectLoosely(currentValue.node.obj);
      const aggregatorReference = similarityAggregatorReference.get(valueHash) ?? {
        currentNodeId: new Set<number>(),
        nextNodeId: new Set<number>(),
      };

      aggregatorReference.currentNodeId.add(nextBestMatch.currentValueNodeId);
      aggregatorReference.nextNodeId.add(nextBestMatch.nextValueNodeId);
      usedCurrentNodes.add(nextBestMatch.currentValueNodeId);
      usedNextNodes.add(nextBestMatch.nextValueNodeId);
      this.usedCurrentValueNodeIds.add(nextBestMatch.currentValueNodeId);
      this.usedNextValueNodeIds.add(nextBestMatch.nextValueNodeId);
      similarityAggregatorReference.set(valueHash, aggregatorReference);
    }
  }

  /**
   * Move available nodes to disjunct nodes.
   */
  private fillDisjunctNodes(): void {
    for (const currentValue of this.currentValues) {
      if (this.usedCurrentValueNodeIds.has(currentValue.nodeId)) {
        continue;
      }

      this.results.disjunctNodes.currentNodeId.add(currentValue.nodeId);
    }

    for (const nextValue of this.nextValues) {
      if (this.usedNextValueNodeIds.has(nextValue.nodeId)) {
        continue;
      }

      this.results.disjunctNodes.nextNodeId.add(nextValue.nodeId);
    }

    this.currentValues = [];
    this.nextValues = [];
  }

  /**
   * Debugging method to log the current state of the comparison.
   */
  private debug(): void {
    const perfectMatchCounter = {current: 0, next: 0};
    for (const [_, value] of this.results.perfectMatchNodes.entries()) {
      perfectMatchCounter.current += value.currentNodeId.size;
      perfectMatchCounter.next += value.nextNodeId.size;
    }

    const nextBestMatchCounter = {current: 0, next: 0};
    for (const [_, value] of Object.entries(this.results.nextBestMatchNodes)) {
      for (const [__, nodes] of value.entries()) {
        nextBestMatchCounter.current += nodes.currentNodeId.size;
        nextBestMatchCounter.next += nodes.nextNodeId.size;
      }
    }

    console.log('----------');
    console.log('Perfect matches:', perfectMatchCounter);
    console.log('Next best nodes:', nextBestMatchCounter);
    console.log('Disjunct nodes:', {current: this.results.disjunctNodes.currentNodeId.size, next: this.results.disjunctNodes.nextNodeId.size});
    console.log('Available nodes:', {current: this.currentValues.length - this.usedCurrentValueNodeIds.size, next: this.nextValues.length - this.usedNextValueNodeIds.size});
  }
}
