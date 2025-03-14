import type {
  FuzzyEqualSimilarity,
  NodeInput,
} from '../../../types/index.js';

/**
 * Request for the next best fit comparison.
 */
export type NextBestFitRequest = {
  currentValues: NodeInput[];
  nextValues: NodeInput[];
  threshold: number;
  propertyThreshold: number;
};

/**
 * Response for the next best fit comparison.
 */
export type NextBestFitResponse = {finished?: true; info?: string} & FuzzyEqualSimilarity;
