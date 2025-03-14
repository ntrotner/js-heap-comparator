import process from 'node:process';
import {
  type FuzzyEqualComparison,
  type FuzzyEqualSimilarity,
  type NodeInput,
} from '../../../types/index.js';
import {
  fuzzyEqual,
  writeToStream,
} from '../../../helpers/index.js';
import {
  type NextBestFitRequest,
} from '../types/next-best-fit.js';

class NextBestFitSpoke {
  /**
   * Stores the current nodes to compare.
   */
  private currentValues: NodeInput[] = [];

  /**
   * Stores the next nodes to compare.
   */
  private nextValues: NodeInput[] = [];

  /**
   * Threshold for next best match.
   */
  private threshold = 0.7;

  /**
   * Threshold for next best match property.
   */
  private propertyThreshold = Infinity;

  constructor() {
    process.stdin.on('data', async (rawInput: string) => {
      const input = JSON.parse(rawInput.toString()) as NextBestFitRequest;
      this.currentValues.push(...input.currentValues);
      this.nextValues.push(...input.nextValues);

      // Stream not done
      if (input.currentValues.length > 0 || input.nextValues.length > 0) {
        return;
      }

      this.threshold = input.threshold;
      this.propertyThreshold = input.propertyThreshold;

      await writeToStream(process.stdout, JSON.stringify({info: `${this.currentValues.length} current values and ${this.nextValues.length} next values received`}) + '\n');
      await this.runComparison();
    });
  }

  /**
   * Run the comparison between the current and next values.
   */
  private async runComparison() {
    const currentValuesLength = this.currentValues.length;
    const loggingInterval = Math.max(1, Math.floor(currentValuesLength / 100));

    for (const [index, currentValue] of this.currentValues.entries()) {
      if (index % loggingInterval === 0) {
        await writeToStream(process.stdout, JSON.stringify({info: `Progress: ${(index / currentValuesLength * 100).toFixed(2)}%`}));
      }

      for (const nextValue of this.nextValues) {
        try {
          const totalSimilarity: FuzzyEqualComparison = fuzzyEqual(currentValue.node.obj, nextValue.node.obj, this.propertyThreshold);

          if (totalSimilarity.propertyCount === 0) {
            continue;
          }

          const similarity = totalSimilarity.matching / totalSimilarity.propertyCount;
          if (similarity < this.threshold) {
            continue;
          }

          await writeToStream(process.stdout, JSON.stringify({similarity: totalSimilarity.matching / totalSimilarity.propertyCount, currentValueNodeId: currentValue.nodeId, nextValueNodeId: nextValue.nodeId}));
        } catch {}
      }
    }

    await writeToStream(process.stdout, JSON.stringify({info: 'Progress: 100%'}));
    await writeToStream(process.stdout, JSON.stringify({finished: true}));
    this.currentValues = [];
    this.nextValues = [];
  }
}

const _spoke = new NextBestFitSpoke();
