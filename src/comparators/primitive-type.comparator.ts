import {
  type BaseComparator,
  type BaseComparisonResult,
  type PerfectMatchTracker,
  type PrimitiveRecord,
} from '../types/index.js';
import {
  getDefaultValueOfNextBestMatchTracker,
} from '../helpers/index.js';

type Options = Record<string, unknown>;

export class PrimitiveTypeComparator<T extends PrimitiveRecord> implements BaseComparator<T, BaseComparisonResult, Options> {
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
  }

  public async compare(): Promise<BaseComparisonResult> {
    console.log('Starting perfect match search for primitive types');
    const currentValuesLength = this.currentValues.length;
    for (const [i, value] of this.currentValues.entries()) {
      this.findPerfectMatch(value);

      if (i % 2500 === 0) {
        this.debug();
        console.log(`Progress: ${(i / currentValuesLength * 100).toFixed(2)}%`);
      }
    }

    console.log('Finished perfect match search for primitive types');
    this.fillDisjunctNodes();
    console.log('Finished matching for primitive types');

    return this.results;
  }

  /**
   * Finds 1:1 matches with current and next nodes and removes them from the values.
   *
   * @param currentValue
   * @returns indicator whether perfect match was found
   */
  private findPerfectMatch(currentValue: T): boolean {
    const perfectMatch = this.nextValues.find(nextValue =>
      !this.usedNextValueNodeIds.has(nextValue.n) && currentValue.value === nextValue.value,
    );

    if (perfectMatch) {
      const valueHash = currentValue.value?.toString() ?? 'undefined';
      const aggregatorReference = this.results.perfectMatchNodes.get(valueHash) ?? {
        currentNodeId: new Set<number>(),
        nextNodeId: new Set<number>(),
      };

      aggregatorReference.currentNodeId.add(currentValue.n);
      aggregatorReference.nextNodeId.add(perfectMatch.n);
      this.results.perfectMatchNodes.set(valueHash, aggregatorReference);
      this.usedCurrentValueNodeIds.add(currentValue.n);
      this.usedNextValueNodeIds.add(perfectMatch.n);

      return true;
    }

    return false;
  }

  /**
   * Move available nodes to disjunct nodes.
   */
  private fillDisjunctNodes(): void {
    for (const currentValue of this.currentValues) {
      if (this.usedCurrentValueNodeIds.has(currentValue.n)) {
        continue;
      }

      this.results.disjunctNodes.currentNodeId.add(currentValue.n);
    }

    for (const nextValue of this.nextValues) {
      if (this.usedNextValueNodeIds.has(nextValue.n)) {
        continue;
      }

      this.results.disjunctNodes.nextNodeId.add(nextValue.n);
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

    console.log('----------');
    console.log('Perfect matches:', perfectMatchCounter);
    console.log('Disjunct nodes:', {current: this.results.disjunctNodes.currentNodeId.size, next: this.results.disjunctNodes.nextNodeId.size});
    console.log('Available nodes:', {current: this.currentValues.length - this.usedCurrentValueNodeIds.size, next: this.nextValues.length - this.usedNextValueNodeIds.size});
  }
}
