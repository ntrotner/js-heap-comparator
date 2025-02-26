import {
  deepEqual,
} from 'fast-equals';
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
} from '../workers/index.js';

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
   * Stores the next nodes to compare.
   */
  private nextValues: T[] = [];

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
    console.log('Starting perfect match search');
    const currentValuesLength = this.currentValues.length;
    for (const [i, value] of this.currentValues.entries()) {
      this.findPerfectMatch(value);

      if (i % 1000 === 0) {
        this.debug();
        console.log(`Progress ${(i / currentValuesLength * 100).toFixed(2)}%`);
      }
    }

    this.debug();
    console.log('Finished perfect match search');

    console.log('Starting next best match search');
    const bestMatchesHub = new NextBestFitHub(this.currentValues, this.nextValues, {threads: this.threads, threshold: this.threshold});
    const bestMatches = await bestMatchesHub.runComparison();
    this.selectNextBestMatches(bestMatches);
    console.log('Finished next best match search');

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
      this.currentValues = this.currentValues.filter(_currentValue => _currentValue.nodeId !== currentValue.nodeId);
      this.nextValues = this.nextValues.filter(nextValue => nextValue.nodeId !== perfectMatch.nodeId);
      return true;
    }

    return false;
  }

  /**
   * Finds all next best matches for the current value in regard to the threshold.
   *
   * @param currentValue
   */
  private findNextBestMatches(currentValue: NodeInput): FuzzyEqualSimilarity[] {
    return this.nextValues.map(nextValue => {
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
    const descendingSortedMatches = matches.sort((a, b) => b.similarity - a.similarity);
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
      similarityAggregatorReference.set(valueHash, aggregatorReference);

      this.currentValues = this.currentValues.filter(_currentValue => _currentValue.nodeId !== nextBestMatch.currentValueNodeId);
      this.nextValues = this.nextValues.filter(nextValue => nextValue.nodeId !== nextBestMatch.nextValueNodeId);
    }
  }

  /**
   * Move available nodes to disjunct nodes.
   */
  private fillDisjunctNodes(): void {
    for (const currentValue of this.currentValues) {
      this.results.disjunctNodes.currentNodeId.add(currentValue.nodeId);
    }

    for (const nextValue of this.nextValues) {
      this.results.disjunctNodes.nextNodeId.add(nextValue.nodeId);
    }

    this.currentValues = [];
    this.nextValues = [];
  }

  /**
   * Debugging method to log the current state of the comparison.
   */
  private debug(): void {
    const perfectMatchCounter = {totalCurrentNode: 0, totalNextNode: 0};
    for (const [_, value] of this.results.perfectMatchNodes.entries()) {
      perfectMatchCounter.totalCurrentNode += value.currentNodeId.size;
      perfectMatchCounter.totalNextNode += value.nextNodeId.size;
    }

    const nextBestMatchCounter = Object.fromEntries(
      Object.entries(getDefaultValueOfNextBestMatchTracker()).map(([key]) => [key, {totalCurrentNode: 0, totalNextNode: 0}]),
    ) as Record<keyof NextBestMatchTracker, {totalCurrentNode: number; totalNextNode: number}>;

    for (const similarity of (Object.keys(this.results.nextBestMatchNodes) as unknown as Array<keyof NextBestMatchTracker>)) {
      for (const [_, value] of this.results.nextBestMatchNodes[similarity].entries()) {
        nextBestMatchCounter[similarity].totalCurrentNode += value.currentNodeId.size;
        nextBestMatchCounter[similarity].totalNextNode += value.nextNodeId.size;
      }
    }

    console.log('----------');
    console.log('Amount of unique objects:', this.results.perfectMatchNodes.size);
    console.log('Perfect matches:', perfectMatchCounter);
    console.log('Next best matches:', nextBestMatchCounter);
    console.log('');
    console.log('Available current nodes:', this.currentValues.length);
    console.log('Available next nodes:', this.nextValues.length);
    console.log('');
    console.log('Disjunct current nodes:', this.results.disjunctNodes.currentNodeId.size);
    console.log('Disjunct next nodes:', this.results.disjunctNodes.nextNodeId.size);
  }
}
