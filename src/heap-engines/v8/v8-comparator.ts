import {
  type BaseHeapComparator,
  type BaseHeapComparatorOptions,
  type HeapComparisonResult,
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
import {
  Logger,
} from '../../helpers/index.js';

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
    nextBestMatchObjectPropertyThreshold: 10_000,
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
    Logger.info('V8Comparator initialized with options: ' + JSON.stringify(this.options));
  }

  /**
   * Compare two heap dumps from V8 javascript runtime
   *
   * @param currentHeapPath
   * @param nextHeapPath
   */
  async compare(currentHeapPath: string, nextHeapPath: string): Promise<HeapComparisonResult> {
    const emptyMap = new Map<never, never>();

    const currentHeapAnalysis = new ObjectDeepAnalysis();
    await currentHeapAnalysis.analyzeSnapshotFromFile(currentHeapPath);
    const currentHeapNodesMap = currentHeapAnalysis.getDeepFilledObjects() ?? emptyMap;
    const currentHeapNodesPrimitiveType = currentHeapAnalysis.getPrimitiveNodes() ?? emptyMap;
    const currentHeapNodesDeepFilled = [...currentHeapNodesMap.entries()];

    const nextHeapAnalysis = new ObjectDeepAnalysis();
    await nextHeapAnalysis.analyzeSnapshotFromFile(nextHeapPath);
    const nextHeapNodesMap = nextHeapAnalysis.getDeepFilledObjects() ?? emptyMap;
    const nextHeapNodesPrimitiveType = nextHeapAnalysis.getPrimitiveNodes() ?? emptyMap;
    const nextHeapNodesDeepFilled = [...nextHeapNodesMap.entries()];

    const primitiveTypeComparator = new PrimitiveTypeComparator();
    primitiveTypeComparator.initialize(
      new Map([...currentHeapNodesPrimitiveType.entries()].map(([nodeId, primitiveType]) => ([nodeId, primitiveType]))),
      new Map([...nextHeapNodesPrimitiveType.entries()].map(([nodeId, primitiveType]) => ([nodeId, primitiveType]))),
      {},
    );
    const primitiveTypeComparatorResults = await primitiveTypeComparator.compare();

    const objectComparator = new ObjectComparator();
    objectComparator.initialize(
      new Map(currentHeapNodesDeepFilled.map(([nodeId, objectRecord]) => ([nodeId, {nodeId, node: objectRecord}]))),
      new Map(nextHeapNodesDeepFilled.map(([nodeId, objectRecord]) => ([nodeId, {nodeId, node: objectRecord}]))),
      {
        nextBestMatchThreshold: this.options.nextBestMatchObjectThreshold,
        nextBestMatchPropertyThreshold: this.options.nextBestMatchObjectPropertyThreshold,
        threads: this.options.threads,
      },
    );
    const objectComparatorResults = await objectComparator.compare();

    const fileWriterOptions = {filePath: this.options.presenterFilePath};
    const allCurrentHeapNodes = new Map([...currentHeapNodesMap.entries(), ...currentHeapNodesPrimitiveType.entries()]
      .map(([id, node]) => ([id, node])),
    );
    const allNextHeapNodes = new Map([...nextHeapNodesMap.entries(), ...nextHeapNodesPrimitiveType.entries()]
      .map(([id, node]) => ([id, node])),
    );

    if (this.options.activePresenter.perfectMatch) {
      const comparisonTypes = [{comparisonType: 'object', results: objectComparatorResults}, {comparisonType: 'primitive-type', results: primitiveTypeComparatorResults}];

      for (const {comparisonType, results} of comparisonTypes) {
        const perfectMatchPresenter = new PerfectMatchPresenter();
        perfectMatchPresenter.initialize(allCurrentHeapNodes, allNextHeapNodes, results.perfectMatchNodes, {...fileWriterOptions, fileName: `perfect-match.${comparisonType}.json`});
        await perfectMatchPresenter.report();
      }
    }

    if (this.options.activePresenter.nextBestMatch) {
      const comparisonTypes = [{comparisonType: 'object', results: objectComparatorResults}];

      for (const {comparisonType, results} of comparisonTypes) {
        const nextBestMatchPresenter = new NextBestMatchPresenter();
        nextBestMatchPresenter.initialize(allCurrentHeapNodes, allNextHeapNodes, results.nextBestMatchNodes, {...fileWriterOptions, fileName: `next-best-match.${comparisonType}.json`});
        await nextBestMatchPresenter.report();
      }
    }

    if (this.options.activePresenter.disjunctNodes) {
      const comparisonTypes = [{comparisonType: 'object', results: objectComparatorResults}, {comparisonType: 'primitive-type', results: primitiveTypeComparatorResults}];

      for (const {comparisonType, results} of comparisonTypes) {
        const disjunctNodesPresenter = new DisjunctNodesPresenter();
        disjunctNodesPresenter.initialize(allCurrentHeapNodes, allNextHeapNodes, results.disjunctNodes, {...fileWriterOptions, fileName: `disjunct-nodes.${comparisonType}.json`});
        await disjunctNodesPresenter.report();
      }
    }

    if (this.options.activePresenter.statistics) {
      const comparisonTypes = [{comparisonType: 'object', results: objectComparatorResults}, {comparisonType: 'primitive-type', results: primitiveTypeComparatorResults}];

      for (const {comparisonType, results} of comparisonTypes) {
        const statisticsPresenter = new StatisticsPresenter();
        statisticsPresenter.initialize(allCurrentHeapNodes, allNextHeapNodes, results, {...fileWriterOptions, fileName: `statistics.${comparisonType}.json`});
        await statisticsPresenter.report();
      }
    }
  }
}
