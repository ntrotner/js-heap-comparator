import {
  type BaseComparisonResult,
  type DisjunctTracker,
  type NextBestMatchTracker,
  type PerfectMatchTracker,
} from './comparator.js';
import type {
  ObjectRecord,
} from './custom-memlab.js';

/**
 * Base input for all presenters.
 */
export type BaseComparisonNodesInput = Map<number, ObjectRecord>;

/**
 * Base options for all presenters.
 */
export type BaseComparisonPresenterOptions = Record<string, unknown>;

/**
 * Interface for presenter that reports the comparison result of the base comparison.
 */
export type BaseComparisonPresenter<T, O extends BaseComparisonPresenterOptions> = {
  /**
   * Initialize the presenter with the current and next nodes to compare.
   *
   * @param currentValues
   * @param nextValues
   * @param input
   * @param options
   */
  initialize(currentValues: BaseComparisonNodesInput, nextValues: BaseComparisonNodesInput, input: T, options: O): void;

  /**
   * Write the comparison result.
   */
  report(): Promise<void>;
};

/**
 * Options for the perfect match comparison presenter.
 */
export type BasePerfectMatchPresenterOptions = BaseComparisonPresenterOptions & {filePath: string; fileName: string};

/**
 * Interface for presenter that reports the perfect match comparison result.
 */
export type BasePerfectMatchPresenter = BaseComparisonPresenter<Map<string, PerfectMatchTracker>, BasePerfectMatchPresenterOptions>;

/**
 * Options for next best match comparison presenter.
 */
export type BaseNextBestMatchPresenterOptions = BaseComparisonPresenterOptions & {filePath: string; fileName: string};

/**
 * Interface for presenter that reports the next best match comparison result.
 */
export type BaseNextBestMatchPresenter = BaseComparisonPresenter<NextBestMatchTracker, BaseNextBestMatchPresenterOptions>;

/**
 * Options for the disjunct nodes comparison presenter.
 */
export type BaseDisjunctNodesPresenterOptions = BaseComparisonPresenterOptions & {filePath: string; fileName: string};

/**
 * Interface for presenter that reports the disjunct nodes comparison result.
 */
export type BaseDisjunctNodesPresenter = BaseComparisonPresenter<DisjunctTracker, BaseDisjunctNodesPresenterOptions>;

/**
 * Options for the statistics presenter.
 */
export type BaseStatisticsPresenterOptions = BaseComparisonPresenterOptions & {filePath: string; fileName: string};

/**
 * Interface for presenter that reports the statistics comparison result.
 */
export type BaseStatisticsPresenter = BaseComparisonPresenter<BaseComparisonResult, BaseStatisticsPresenterOptions>;
