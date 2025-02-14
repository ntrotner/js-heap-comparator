/**
 * Base interface for all match tracker implementations.
 */
export type BaseMatchTracker = {
  currentNodeId: Set<number>;
  nextNodeId: Set<number>;
};

/**
 * Interface for perfect match tracker.
 */
export type PerfectMatchTracker = Record<string, unknown> & BaseMatchTracker;

/**
 * Interface for disjunct nodes' tracker.
 */
export type DisjunctTracker = Record<string, unknown> & BaseMatchTracker;

/**
 * Interface for comparison result.
 */
export type BaseComparisonResult = {
  perfectMatchNodes: Map<string, PerfectMatchTracker>;
  disjunctNodes: DisjunctTracker;
};

/**
 * Base interface for all heap engine implementations.
 */
export type BaseComparator<T, O extends BaseComparisonResult> = {
  /**
   * Initialize the comparator with the current and next nodes.
   *
   * @param currentValues
   * @param nextValues
   */
  initialize(currentValues: T[], nextValues: T[]): void;

  /**
   * Compare specific nodes and find matches
   *
   * @returns result object with detailed comparison
   */
  compare(): Promise<O>;
};
