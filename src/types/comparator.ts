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
 * Interface for next best match tracker.
 */
export type NextBestMatchTracker = {
  100: Map<string, Record<string, unknown> & BaseMatchTracker>;
  95: Map<string, Record<string, unknown> & BaseMatchTracker>;
  90: Map<string, Record<string, unknown> & BaseMatchTracker>;
  85: Map<string, Record<string, unknown> & BaseMatchTracker>;
  80: Map<string, Record<string, unknown> & BaseMatchTracker>;
  75: Map<string, Record<string, unknown> & BaseMatchTracker>;
  70: Map<string, Record<string, unknown> & BaseMatchTracker>;
  65: Map<string, Record<string, unknown> & BaseMatchTracker>;
  60: Map<string, Record<string, unknown> & BaseMatchTracker>;
  55: Map<string, Record<string, unknown> & BaseMatchTracker>;
  50: Map<string, Record<string, unknown> & BaseMatchTracker>;
  45: Map<string, Record<string, unknown> & BaseMatchTracker>;
  40: Map<string, Record<string, unknown> & BaseMatchTracker>;
  35: Map<string, Record<string, unknown> & BaseMatchTracker>;
  30: Map<string, Record<string, unknown> & BaseMatchTracker>;
  25: Map<string, Record<string, unknown> & BaseMatchTracker>;
  20: Map<string, Record<string, unknown> & BaseMatchTracker>;
  15: Map<string, Record<string, unknown> & BaseMatchTracker>;
  10: Map<string, Record<string, unknown> & BaseMatchTracker>;
  5: Map<string, Record<string, unknown> & BaseMatchTracker>;
  0: Map<string, Record<string, unknown> & BaseMatchTracker>;
};

/**
 * Interface for disjunct nodes' tracker.
 */
export type DisjunctTracker = Record<string, unknown> & BaseMatchTracker;

/**
 * Interface for comparison result.
 */
export type BaseComparisonResult = {
  perfectMatchNodes: Map<string, PerfectMatchTracker>;
  nextBestMatchNodes: NextBestMatchTracker;
  disjunctNodes: DisjunctTracker;
};

/**
 * Base interface for all heap engine implementations.
 */
export type BaseComparator<T, O extends BaseComparisonResult, P extends Record<string, any>> = {
  /**
   * Initialize the comparator with the current and next nodes.
   *
   * @param currentValues
   * @param nextValues
   * @param options
   */
  initialize(currentValues: T[], nextValues: T[], options: P): void;

  /**
   * Compare specific nodes and find matches
   *
   * @returns result object with detailed comparison
   */
  compare(): Promise<O>;
};
