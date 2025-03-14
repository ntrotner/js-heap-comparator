import {
  type BaseComparator,
  type BaseComparisonResult,
  type PerfectMatchTracker,
  type PrimitiveRecord,
  type PrimitiveTypeMap,
} from '../types/index.js';
import {
  getDefaultValueOfNextBestMatchTracker,
  Logger,
} from '../helpers/index.js';

type Options = Record<string, unknown>;

export class PrimitiveTypeComparator<T extends PrimitiveTypeMap> implements BaseComparator<T, BaseComparisonResult, Options> {
  /**
   * Stores the current nodes to compare.
   */
  private currentValues = new Map() as T;

  /**
   * Stores the next nodes to compare.
   */
  private nextValues = new Map() as T;

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
  }

  /*+
    * @inheritdoc
   */
  public async compare(): Promise<BaseComparisonResult> {
    this.orchestratePerfectMatchSearch();

    this.fillDisjunctNodes();
    Logger.info('Finished search for primitive types');
    this.debug();
    return this.results;
  }

  /**
   * Orchestrate the perfect match search for primitive types.
   */
  private orchestratePerfectMatchSearch(): void {
    const currentValuesList = [...this.currentValues.values()];
    const currentValuesLength = this.currentValues.size;
    const loggingInterval = Math.max(1, Math.floor(currentValuesLength / 100));
    let iteration = 0;
    Logger.info('Starting perfect match search for primitive types with size: ' + currentValuesLength);

    for (const value of currentValuesList) {
      this.findPerfectMatch(value);
      iteration += 1;

      if (iteration % loggingInterval === 0) {
        this.debug();
        Logger.info(`Progress: ${(iteration / currentValuesLength * 100).toFixed(2)}%`);
      }
    }

    Logger.info('Finished perfect match search for primitive types');
  }

  /**
   * Finds 1:1 matches with current and next nodes and removes them from the values.
   *
   * @param currentValue
   * @returns indicator whether perfect match was found
   */
  private findPerfectMatch(currentValue: PrimitiveRecord): boolean {
    const perfectMatch = [...this.nextValues.values()].find(nextValue => currentValue.value === nextValue.value);
    if (!perfectMatch) {
      return false;
    }

    const valueHash = currentValue.value?.toString() ?? 'undefined';
    const aggregatorReference = this.results.perfectMatchNodes.get(valueHash) ?? {
      currentNodeId: new Set<number>(),
      nextNodeId: new Set<number>(),
    };
    aggregatorReference.currentNodeId.add(currentValue.n);
    aggregatorReference.nextNodeId.add(perfectMatch.n);
    this.results.perfectMatchNodes.set(valueHash, aggregatorReference);
    this.currentValues.delete(currentValue.n);
    this.nextValues.delete(perfectMatch.n);

    return true;
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

    Logger.info('----------');
    Logger.info('Perfect matches:', JSON.stringify(perfectMatchCounter));
    Logger.info('Disjunct nodes:', JSON.stringify({current: this.results.disjunctNodes.currentNodeId.size, next: this.results.disjunctNodes.nextNodeId.size}));
    Logger.info('Available nodes:', JSON.stringify({current: this.currentValues.size, next: this.nextValues.size}));
  }
}
