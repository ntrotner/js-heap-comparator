/**
 * Result of the comparison between two heaps.
 */
export type HeapComparisonResult = void;

/**
 * Options for the base heap comparator.
 */
export type BaseHeapComparatorOptions = {
  activePresenter: {
    statistics: boolean;
    perfectMatch: boolean;
    nextBestMatch: boolean;
    disjunctNodes: boolean;
  };
  presenterFilePath: string;
  nextBestMatchObjectThreshold: number;
  nextBestMatchObjectPropertyThreshold: number;
  threads: number;
};

/**
 * Base interface for all heap engine implementations.
 */
export type BaseHeapComparator = {
  /**
   * Initialize the heap comparator with options.
   *
   * @param options
   */
  initialize(options: BaseHeapComparatorOptions): void;

  /**
   * Orchestrator function to load and compare heaps
   *
   * @param currentHeapPath path to current/base heap
   * @param nextHeapPath path to next heap
   * @returns nodes and edges that are not present in the `currentHeapPath`.
   */
  compare(currentHeapPath: string, nextHeapPath: string): Promise<HeapComparisonResult>;
};
