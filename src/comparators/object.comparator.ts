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
  type NodeInput,
  type PerfectMatchTracker,
} from '../types/index.js';
import {
  hashObjectLoosely,
  fuzzyEqual,
  mapIntervalToNumber,
  getDefaultValueOfNextBestMatchTracker,
  Logger,
} from '../helpers/index.js';
import {
  NextBestFitHub,
} from './workers/index.js';

type Options = {
  nextBestMatchThreshold: number;
  nextBestMatchPropertyThreshold: number;
  threads: number;
};

export class ObjectComparator<T extends Map<number, NodeInput>> implements BaseComparator<T, BaseComparisonResult, Options> {
  /**
   * Stores the current nodes to compare.
   */
  private currentValues = new Map() as T;

  /**
   * Stores the next nodes to compare.
   */
  private nextValues = new Map() as T;

  /**
   * Threshold for next best match.
   */
  private threshold = 0.7;

  /**
   * Amount of threads for parallel next best check.
   */
  private threads = 1;

  /**
   * Threshold for next best match property.
   */
  private nextBestMatchPropertyThreshold = Infinity;

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
  public initialize(currentValues: T, nextValues: T, options: Options): void {
    this.currentValues = currentValues;
    this.nextValues = nextValues;
    this.threshold = options.nextBestMatchThreshold;
    this.threads = options.threads;
    this.nextBestMatchPropertyThreshold = options.nextBestMatchPropertyThreshold;
  }

  /**
   * @inheritdoc
   */
  public async compare(): Promise<BaseComparisonResult> {
    this.orchestratePerfectMatchSearch();
    await this.orchestrateNextBestMatchSearch();

    this.fillDisjunctNodes();
    Logger.info('Finished search for objects');
    this.debug();
    return this.results;
  }

  /**
   * Orchestrate the perfect match search for objects.
   */
  private orchestratePerfectMatchSearch(): void {
    const currentValuesList = [...this.currentValues.values()];
    const currentValuesLength = this.currentValues.size;
    const loggingInterval = Math.max(1, Math.floor(currentValuesLength / 100));
    let iteration = 0;
    Logger.info('Starting perfect match search for objects with size: ' + currentValuesLength);

    for (const value of currentValuesList) {
      this.findPerfectMatch(value);
      iteration += 1;

      if (iteration % loggingInterval === 0) {
        this.debug();
        Logger.info(`Progress: ${(iteration / currentValuesLength * 100).toFixed(2)}%`);
      }
    }

    Logger.info('Finished perfect match search for objects');
  }

  /**
   * Orchestrate the next best match search for objects.
   */
  private async orchestrateNextBestMatchSearch(): Promise<void> {
    const currentValuesList = [...this.currentValues.values()].sort((a, b) => a.nodeId - b.nodeId);
    const nextValuesList = [...this.nextValues.values()].sort((a, b) => a.nodeId - b.nodeId);
    const currentValuesLength = this.currentValues.size;
    const loggingInterval = Math.max(1, Math.floor(currentValuesLength / 100));
    let iteration = 0;
    let bestMatches = [];
    Logger.info('Starting next best match search for objects with size: ' + currentValuesLength);

    if (this.threads <= 1) {
      for (const value of currentValuesList) {
        bestMatches.push(...this.findNextBestMatches(value, nextValuesList));
        iteration += 1;

        if (iteration % loggingInterval === 0) {
          this.debug();
          Logger.info(`Progress: ${(iteration / currentValuesLength * 100).toFixed(2)}%`);
        }
      }
    } else {
      const bestMatchesHub = new NextBestFitHub(currentValuesList, nextValuesList, {threads: this.threads, threshold: this.threshold, propertyThreshold: this.nextBestMatchPropertyThreshold});
      bestMatches = await bestMatchesHub.runComparison();
    }

    Logger.info('Finished next best match search for objects');
    this.selectNextBestMatches(bestMatches);
  }

  /**
   * Finds 1:1 matches with current and next nodes and removes them from the values.
   *
   * @param currentValue
   * @returns indicator whether perfect match was found
   */
  private findPerfectMatch(currentValue: NodeInput): boolean {
    const perfectMatch = [...this.nextValues.values()].find(nextValue => {
      try {
        return deepEqual(currentValue.node.obj, nextValue.node.obj);
      } catch {
        return false;
      }
    });
    if (!perfectMatch) {
      return false;
    }

    const valueHash = hashObjectLoosely(currentValue.node.obj);
    const aggregatorReference = this.results.perfectMatchNodes.get(valueHash) ?? {
      currentNodeId: new Set<number>(),
      nextNodeId: new Set<number>(),
    };
    aggregatorReference.currentNodeId.add(currentValue.nodeId);
    aggregatorReference.nextNodeId.add(perfectMatch.nodeId);
    this.results.perfectMatchNodes.set(valueHash, aggregatorReference);
    this.currentValues.delete(currentValue.nodeId);
    this.nextValues.delete(perfectMatch.nodeId);

    return true;
  }

  /**
   * Finds all next best matches for the current value in regard to the threshold.
   *
   * @param currentValue
   * @param nextValues
   */
  private findNextBestMatches(currentValue: NodeInput, nextValues: NodeInput[]): FuzzyEqualSimilarity[] {
    return nextValues.flatMap(nextValue => {
      try {
        const totalSimilarity: FuzzyEqualComparison = fuzzyEqual(currentValue.node.obj, nextValue.node.obj, this.nextBestMatchPropertyThreshold);
        if (totalSimilarity.propertyCount === 0) {
          return [];
        }

        const similarity = totalSimilarity.matching / totalSimilarity.propertyCount;
        if (similarity < this.threshold) {
          return [];
        }

        return [{similarity, currentValueNodeId: currentValue.nodeId, nextValueNodeId: nextValue.nodeId}];
      } catch (error) {
        Logger.error('Incomparable inputs', error, currentValue.nodeId, nextValue.nodeId);
        return [];
      }
    });
  }

  /**
   * Selects the next best matches and removes them from the values and tracks selected nodes.
   *
   * @param matches
   */
  private selectNextBestMatches(matches: FuzzyEqualSimilarity[]): void {
    Logger.info('Starting selection of next best match search for objects');
    const descendingSortedMatches = sort(matches).desc(match => match.similarity);
    const usedCurrentNodes = new Set<number>();
    const usedNextNodes = new Set<number>();

    for (const nextBestMatch of descendingSortedMatches) {
      const currentValue = this.currentValues.get(nextBestMatch.currentValueNodeId);
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
      this.currentValues.delete(nextBestMatch.currentValueNodeId);
      this.nextValues.delete(nextBestMatch.nextValueNodeId);
      similarityAggregatorReference.set(valueHash, aggregatorReference);
    }

    Logger.info('Finished selection of next best match search for objects');
  }

  /**
   * Move available nodes to disjunct nodes.
   */
  private fillDisjunctNodes(): void {
    for (const key of this.currentValues.keys()) {
      this.currentValues.delete(key);
      this.results.disjunctNodes.currentNodeId.add(key);
    }

    for (const key of this.nextValues.keys()) {
      this.nextValues.delete(key);
      this.results.disjunctNodes.nextNodeId.add(key);
    }
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

    Logger.info('----------');
    Logger.info('Perfect matches:', JSON.stringify(perfectMatchCounter));
    Logger.info('Next best nodes:', JSON.stringify(nextBestMatchCounter));
    Logger.info('Disjunct nodes:', JSON.stringify({current: this.results.disjunctNodes.currentNodeId.size, next: this.results.disjunctNodes.nextNodeId.size}));
    Logger.info('Available nodes:', JSON.stringify({current: this.currentValues.size, next: this.nextValues.size}));
  }
}
