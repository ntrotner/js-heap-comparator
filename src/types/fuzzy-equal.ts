/**
 * Result from fuzzy equal.
 * Copy from 'fuzzy-equal' package documentation
 */
export type FuzzyEqualComparison = {
  matching_types: boolean;
  similarity: number;
  deep_equal: boolean;
  property_count?: number;
  matching?: number;
  differing_properties?: string[];
  common_properties?: Record<string, boolean>;
  deep_differences?: Record<string, FuzzyEqualComparison>;
  left_only?: string[];
  right_only?: string[];
};
