import path from 'node:path';
import fs from 'node:fs';
import {
  type BaseComparisonNodesInput,
  type BaseComparisonResult,
  type BaseDisjunctNodesPresenterOptions,
  type BaseStatisticsPresenter,
  type BaseStatisticsPresenterOptions,
  type PerfectMatchTracker,
} from '../types/index.js';
import {
  getDefaultValueOfNextBestMatchTracker,
} from '../helpers/index.js';

type HeapSizeOfDisjunctNodes = {currentShallowHeapSize: number; nextShallowHeapSize: number};
type HeapSizeOfNextBestMatch = {sizeByAccuracy: Record<string, {currentShallowHeapSize: number; nextShallowHeapSize: number}>; amountByAccuracy: Record<string, number>};
type HeapSizeOfPerfectMatch = {currentShallowHeapSize: number; nextShallowHeapSize: number};
type TotalHeapSizeDifference = {currentShallowHeapSize: number; nextShallowHeapSize: number; difference: number; percentage: number};
type TotalNumberOfNodes = {perfectMatchesCurrentNodes: number; perfectMatchesNextNodes: number; nextBestMatchesCurrentNodes: number; nextBestMatchesNextNodes: number; disjunctCurrentNodes: number; disjunctNextNodes: number};

export class StatisticsPresenter<T extends BaseComparisonNodesInput> implements BaseStatisticsPresenter {
  /**
   * Stores the current nodes to compare.
   */
  private currentValues = new Map() as T;

  /**
   * Stores the next nodes to compare.
   */
  private nextValues = new Map() as T;

  /**
   * Stores the comparison results.
   */
  private comparisonResults: BaseComparisonResult = {
    perfectMatchNodes: new Map<string, PerfectMatchTracker>(),
    nextBestMatchNodes: getDefaultValueOfNextBestMatchTracker(),
    disjunctNodes: {
      currentNodeId: new Set<number>(),
      nextNodeId: new Set<number>(),
    },
  };

  /**
   * Stores the options.
   */
  private options: BaseDisjunctNodesPresenterOptions = {
    filePath: '',
    fileName: '',
  };

  /**
   * @inheritdoc
   */
  initialize(currentValues: T, nextValues: T, input: BaseComparisonResult, options: BaseStatisticsPresenterOptions): void {
    this.currentValues = currentValues;
    this.nextValues = nextValues;
    this.comparisonResults = input;
    this.options = options;
  }

  /**
   * @inheritdoc
   */
  async report(): Promise<void> {
    const heapSizeOfPerfectMatch = this.getHeapSizeOfPerfectMatch();
    const heapSizeOfNextBestMatch = this.getHeapSizeOfNextBestMatch();
    const heapSizeOfDisjunctNodes = this.getHeapSizeOfDisjunctNodes();
    const totalNumberOfNodes = this.getTotalNumberOfNodes();
    const totalSizeDifference = this.calculateTotalHeapSizeDifference(heapSizeOfPerfectMatch, heapSizeOfNextBestMatch, heapSizeOfDisjunctNodes);

    const pathToWrite = path.join(this.options.filePath, this.options.fileName);
    const dataToWrite = JSON.stringify({
      totalSizeDifference,
      totalNumberOfNodes,
      heapSizeOfPerfectMatch,
      heapSizeOfNextBestMatch,
      heapSizeOfDisjunctNodes,
    });
    fs.writeFileSync(pathToWrite, dataToWrite);
  }

  /**
   * Calculate the total heap size difference.
   *
   * @param heapSizeOfPerfectMatch
   * @param heapSizeOfNextBestMatch
   * @param heapSizeOfDisjunctNodes
   * @private
   */
  private calculateTotalHeapSizeDifference(heapSizeOfPerfectMatch: HeapSizeOfPerfectMatch, heapSizeOfNextBestMatch: HeapSizeOfNextBestMatch, heapSizeOfDisjunctNodes: HeapSizeOfDisjunctNodes): TotalHeapSizeDifference {
    const {sizeByAccuracy} = heapSizeOfNextBestMatch;
    const {currentShallowHeapSize: currentDisjunctNodesShallowHeapSize, nextShallowHeapSize: nextDisjunctNodesShallowHeapSize} = heapSizeOfDisjunctNodes;

    const currentShallowHeapSize = Object.values(sizeByAccuracy).reduce((accumulator, value) => accumulator + value.currentShallowHeapSize, 0) + currentDisjunctNodesShallowHeapSize + heapSizeOfPerfectMatch.currentShallowHeapSize;
    const nextShallowHeapSize = Object.values(sizeByAccuracy).reduce((accumulator, value) => accumulator + value.nextShallowHeapSize, 0) + nextDisjunctNodesShallowHeapSize + heapSizeOfPerfectMatch.nextShallowHeapSize;
    const difference = nextShallowHeapSize - currentShallowHeapSize;
    const percentage = (nextShallowHeapSize - currentShallowHeapSize) / nextShallowHeapSize * 100;

    return {
      currentShallowHeapSize, nextShallowHeapSize, difference, percentage,
    };
  }

  /**
   * Get the total number of nodes.
   */
  private getTotalNumberOfNodes(): TotalNumberOfNodes {
    const perfectMatchCounter = {current: 0, next: 0};
    for (const [_, value] of this.comparisonResults.perfectMatchNodes.entries()) {
      perfectMatchCounter.current += value.currentNodeId.size;
      perfectMatchCounter.next += value.nextNodeId.size;
    }

    const nextBestMatchCounter = {current: 0, next: 0};
    for (const [_, value] of Object.entries(this.comparisonResults.nextBestMatchNodes)) {
      for (const [__, nodes] of value.entries()) {
        nextBestMatchCounter.current += nodes.currentNodeId.size;
        nextBestMatchCounter.next += nodes.nextNodeId.size;
      }
    }

    return {
      perfectMatchesCurrentNodes: perfectMatchCounter.current,
      perfectMatchesNextNodes: perfectMatchCounter.next,
      nextBestMatchesCurrentNodes: nextBestMatchCounter.current,
      nextBestMatchesNextNodes: nextBestMatchCounter.next,
      disjunctCurrentNodes: this.comparisonResults.disjunctNodes.currentNodeId.size,
      disjunctNextNodes: this.comparisonResults.disjunctNodes.nextNodeId.size,
    };
  }

  /**
   * Get the heap size of perfect match.
   */
  private getHeapSizeOfPerfectMatch(): HeapSizeOfPerfectMatch {
    let currentShallowHeapSize = 0;
    let nextShallowHeapSize = 0;

    for (const [key, value] of this.comparisonResults.perfectMatchNodes.entries()) {
      for (const nodeId of value.currentNodeId.values()) {
        const relatedNode = this.currentValues.get(nodeId);

        if (relatedNode) {
          currentShallowHeapSize += relatedNode.shallowSize;
        }
      }

      for (const nodeId of value.nextNodeId.values()) {
        const relatedNode = this.nextValues.get(nodeId);

        if (relatedNode) {
          nextShallowHeapSize += relatedNode.shallowSize;
        }
      }
    }

    return {currentShallowHeapSize, nextShallowHeapSize};
  }

  /**
   * Get the heap size of next best match.
   */
  private getHeapSizeOfNextBestMatch(): HeapSizeOfNextBestMatch {
    const sizeByAccuracy: Record<string, {currentShallowHeapSize: number; nextShallowHeapSize: number}> = {};
    const amountByAccuracy: Record<string, number> = {};

    for (const [accuracy, value] of Object.entries(this.comparisonResults.nextBestMatchNodes)) {
      sizeByAccuracy[accuracy] = {currentShallowHeapSize: 0, nextShallowHeapSize: 0};
      amountByAccuracy[accuracy] ??= 0;

      for (const comparisonResult of value.values()) {
        amountByAccuracy[accuracy] += comparisonResult.currentNodeId.size;

        for (const nodeId of comparisonResult.currentNodeId) {
          const relatedNode = this.currentValues.get(nodeId);

          if (relatedNode) {
            sizeByAccuracy[accuracy].currentShallowHeapSize += relatedNode.shallowSize;
          }
        }

        for (const nodeId of comparisonResult.nextNodeId) {
          const relatedNode = this.nextValues.get(nodeId);

          if (relatedNode) {
            sizeByAccuracy[accuracy].nextShallowHeapSize += relatedNode.shallowSize;
          }
        }
      }
    }

    return {sizeByAccuracy, amountByAccuracy};
  }

  /**
   * Get the heap size of disjunct nodes.
   */
  private getHeapSizeOfDisjunctNodes(): HeapSizeOfDisjunctNodes {
    let currentShallowHeapSize = 0;
    let nextShallowHeapSize = 0;

    for (const nodeId of this.comparisonResults.disjunctNodes.currentNodeId.values()) {
      const relatedNode = this.currentValues.get(nodeId);

      if (relatedNode) {
        currentShallowHeapSize += relatedNode.shallowSize;
      }
    }

    for (const nodeId of this.comparisonResults.disjunctNodes.nextNodeId.values()) {
      const relatedNode = this.nextValues.get(nodeId);

      if (relatedNode) {
        nextShallowHeapSize += relatedNode.shallowSize;
      }
    }

    return {currentShallowHeapSize, nextShallowHeapSize};
  }
}
