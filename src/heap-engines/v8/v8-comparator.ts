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
} from '../../comparators/index.js';
import {
  DisjunctNodesPresenter,
  PerfectMatchPresenter,
} from '../../presenters/index.js';

export class V8Comparator implements BaseHeapComparator {
  /**
   * Comparator options.
   */
  private options: BaseHeapComparatorOptions = {
    presenterFilePath: './',
  };

  /**
   * @inheritdoc
   */
  initialize(options: BaseHeapComparatorOptions): void {
    this.options = options;
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

    const objectComparator = new ObjectComparator();
    objectComparator.initialize(
      currentHeapNodesDeepFilled.map(([nodeId, objectRecord]) => ({nodeId, node: objectRecord})),
      nextHeapNodesDeepFilled.map(([nodeId, objectRecord]) => ({nodeId, node: objectRecord})),
    );
    const objectComparatorResults = await objectComparator.compare();

    const fileWriterOptions = {filePath: this.options.presenterFilePath};
    const perfectMatchPresenter = new PerfectMatchPresenter();
    perfectMatchPresenter.initialize(currentHeapNodesMap, nextHeapNodesMap, objectComparatorResults.perfectMatchNodes, {...fileWriterOptions, fileName: 'perfect-match.json'});
    await perfectMatchPresenter.report();

    const disjunctNodesPresenter = new DisjunctNodesPresenter();
    disjunctNodesPresenter.initialize(currentHeapNodesMap, nextHeapNodesMap, objectComparatorResults.disjunctNodes, {...fileWriterOptions, fileName: 'disjunct-nodes.json'});
    await disjunctNodesPresenter.report();

    return {
      nodes: [],
      edges: [],
    };
  }
}
