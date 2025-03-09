import {
  type BaseHeapComparator,
  type BaseHeapComparatorOptions,
  type HeapComparisonResult,
  type ObjectMap,
} from '../../types/index.js';
import {
  ObjectDeepAnalysis,
} from '../../memlab/heap-analysis/index.js';
import {
  ObjectComparator,
  PrimitiveTypeComparator,
} from '../../comparators/index.js';
import {
  DisjunctNodesPresenter,
  PerfectMatchPresenter,
  NextBestMatchPresenter,
  StatisticsPresenter,
} from '../../presenters/index.js';

export class V8Comparator implements BaseHeapComparator {
  /**
   * Comparator options.
   */
  private options: BaseHeapComparatorOptions = {
    activePresenter: {
      statistics: true,
      perfectMatch: false,
      nextBestMatch: false,
      disjunctNodes: false,
    },
    presenterFilePath: './',
    nextBestMatchObjectThreshold: 0.7,
    threads: 1,
  };

  /**
   * @inheritdoc
   */
  initialize(options: BaseHeapComparatorOptions): void {
    this.options = {
      ...this.options,
      ...options,
    };
    console.log('V8Comparator initialized with options: ' + JSON.stringify(this.options));
  }

  /**
   * Compare two heap dumps from V8 javascript runtime
   *
   * @param currentHeapPath
   * @param nextHeapPath
   */
  async compare(currentHeapPath: string, nextHeapPath: string): Promise<HeapComparisonResult> {
    const emptyMap: ObjectMap = new Map();

    const currentHeapAnalysis = new ObjectDeepAnalysis();
    await currentHeapAnalysis.analyzeSnapshotFromFile(currentHeapPath);
    const currentHeapNodesMap = currentHeapAnalysis.getDeepFilledObjects() ?? emptyMap;
    const currentHeapNodesDeepFilled = [...currentHeapNodesMap.entries()];

    const nextHeapAnalysis = new ObjectDeepAnalysis();
    await nextHeapAnalysis.analyzeSnapshotFromFile(nextHeapPath);
    const nextHeapNodesMap = nextHeapAnalysis.getDeepFilledObjects() ?? emptyMap;
    const nextHeapNodesDeepFilled = [...nextHeapNodesMap.entries()];

    const primitiveTypeComparator = new PrimitiveTypeComparator();
    primitiveTypeComparator.initialize(
      currentHeapAnalysis.getPrimitiveNodes(),
      nextHeapAnalysis.getPrimitiveNodes(),
      {},
    );
    const primitiveTypeComparatorResults = await primitiveTypeComparator.compare();

    const objectComparator = new ObjectComparator();
    objectComparator.initialize(
      currentHeapNodesDeepFilled.map(([nodeId, objectRecord]) => ({nodeId, node: objectRecord})),
      nextHeapNodesDeepFilled.map(([nodeId, objectRecord]) => ({nodeId, node: objectRecord})),
      {nextBestMatchThreshold: this.options.nextBestMatchObjectThreshold, threads: this.options.threads},
    );
    const objectComparatorResults = await objectComparator.compare();

    const fileWriterOptions = {filePath: this.options.presenterFilePath};

    if (this.options.activePresenter.perfectMatch) {
      const comparisonTypes = [{comparisonType: 'object', results: objectComparatorResults}, {comparisonType: 'primitive-type', results: primitiveTypeComparatorResults}];

      for (const {comparisonType, results} of comparisonTypes) {
        const perfectMatchPresenter = new PerfectMatchPresenter();
        perfectMatchPresenter.initialize(currentHeapNodesMap, nextHeapNodesMap, objectComparatorResults.perfectMatchNodes, {...fileWriterOptions, fileName: `perfect-match.${comparisonType}.json`});
        await perfectMatchPresenter.report();
      }
    }

    if (this.options.activePresenter.nextBestMatch) {
      const comparisonTypes = [{comparisonType: 'object', results: objectComparatorResults}];

      for (const {comparisonType, results} of comparisonTypes) {
        const nextBestMatchPresenter = new NextBestMatchPresenter();
        nextBestMatchPresenter.initialize(currentHeapNodesMap, nextHeapNodesMap, results.nextBestMatchNodes, {...fileWriterOptions, fileName: `next-best-match.${comparisonType}.json`});
        await nextBestMatchPresenter.report();
      }
    }

    if (this.options.activePresenter.disjunctNodes) {
      const comparisonTypes = [{comparisonType: 'object', results: objectComparatorResults}, {comparisonType: 'primitive-type', results: primitiveTypeComparatorResults}];

      for (const {comparisonType, results} of comparisonTypes) {
        const disjunctNodesPresenter = new DisjunctNodesPresenter();
        disjunctNodesPresenter.initialize(currentHeapNodesMap, nextHeapNodesMap, results.disjunctNodes, {...fileWriterOptions, fileName: `disjunct-nodes.${comparisonType}.json`});
        await disjunctNodesPresenter.report();
      }
    }

    if (this.options.activePresenter.statistics) {
      const comparisonTypes = [{comparisonType: 'object', results: objectComparatorResults}, {comparisonType: 'primitive-type', results: primitiveTypeComparatorResults}];

      for (const {comparisonType, results} of comparisonTypes) {
        const statisticsPresenter = new StatisticsPresenter();
        statisticsPresenter.initialize(currentHeapNodesMap, nextHeapNodesMap, results, {...fileWriterOptions, fileName: `statistics.${comparisonType}.json`});
        await statisticsPresenter.report();
      }
    }
  }
}
