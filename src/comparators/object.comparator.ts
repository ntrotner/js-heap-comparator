import {
  deepEqual,
} from 'fast-equals';
import {
  type BaseComparator,
  type BaseComparisonResult,
  type ObjectRecord,
  type PerfectMatchTracker,
} from '../types/index.js';
import {
  hashObjectLoosely,
} from '../helpers/index.js';

type NodeInput = {
  nodeId: number;
  node: ObjectRecord;
};

export class ObjectComparator<T extends NodeInput> implements BaseComparator<T, BaseComparisonResult> {
  /**
   * Stores the current nodes to compare.
   */
  private currentValues: T[] = [];

  /**
   * Stores the next nodes to compare.
   */
  private nextValues: T[] = [];

  /**
   * Stores the comparison results.
   */
  private readonly results: BaseComparisonResult = {
    perfectMatchNodes: new Map<string, PerfectMatchTracker>(),
    disjunctNodes: {
      currentNodeId: new Set<number>(),
      nextNodeId: new Set<number>(),
    },
  };

  /**
   * @inheritdoc
   */
  public initialize(currentValues: T[], nextValues: T[]): void {
    this.currentValues = currentValues;
    this.nextValues = nextValues;
  }

  /**
   * @inheritdoc
   */
  public async compare(): Promise<BaseComparisonResult> {
    for (const currentValue of this.currentValues) {
      this.findPerfectMatch(currentValue);
    }

    this.fillDisjunctNodes();
    this.debug();
    return this.results;
  }

  /**
   * Finds 1:1 matches with current and next nodes and removes them from the values.
   *
   * @param currentValue
   */
  private findPerfectMatch(currentValue: NodeInput): void {
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
      this.debug();
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

  private debug(): void {
    const perfectMatchCounter = {totalCurrentNode: 0, totalNextNode: 0};
    for (const [_, value] of this.results.perfectMatchNodes.entries()) {
      perfectMatchCounter.totalCurrentNode += value.currentNodeId.size;
      perfectMatchCounter.totalNextNode += value.nextNodeId.size;
    }

    console.log('----------');
    console.log('Statistics of perfect match:');
    console.log('Amount of unique objects:', this.results.perfectMatchNodes.size);
    console.log(perfectMatchCounter);
    console.log('');
    console.log('Available current nodes:', this.currentValues.length);
    console.log('Available next nodes:', this.nextValues.length);
    console.log('');
    console.log('Disjunct current nodes:', this.results.disjunctNodes.currentNodeId.size);
    console.log('Disjunct next nodes:', this.results.disjunctNodes.nextNodeId.size);
  }
}
