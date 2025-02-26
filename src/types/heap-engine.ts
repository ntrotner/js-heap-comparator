import {
  type IHeapNode,
  type IHeapEdge,
} from '@memlab/core';

/**
 * Result of the comparison between two heaps.
 */
export type HeapComparisonResult = {
  nodes: IHeapNode[];
  edges: IHeapEdge[];
};

/**
 * Options for the base heap comparator.
 */
export type BaseHeapComparatorOptions = {
  presenterFilePath: string;
  nextBestMatchObjectThreshold: number;
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
