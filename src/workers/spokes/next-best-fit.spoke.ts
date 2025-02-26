import process from 'node:process';
import {
  type FuzzyEqualComparison,
  type FuzzyEqualSimilarity,
  type NodeInput,
} from '../../types/index.js';
import {
  fuzzyEqual,
  writeToStream,
} from '../../helpers/index.js';
import {
  type NextBestFitRequest,
} from '../types/next-best-fit.js';

const currentValues: NodeInput[] = [];
const nextValues: NodeInput[] = [];

process.stdin.on('data', async (rawInput: string) => {
  const input = JSON.parse(rawInput.toString()) as NextBestFitRequest;
  currentValues.push(...input.currentValues);
  nextValues.push(...input.nextValues);
  if (input.currentValues.length > 0 || input.nextValues.length > 0) {
    return;
  }

  await writeToStream(process.stdout, JSON.stringify({info: `${currentValues.length} current values and ${nextValues.length} next values received`}) + '\n');
  for (const [index, currentValue] of currentValues.entries()) {
    if (index % 100 === 0) {
      await writeToStream(process.stdout, JSON.stringify({info: `[PID: ${process.pid}] Progress: ${(index / currentValues.length * 100).toFixed(2)}%`}) + '\n');
    }

    for (const nextValue of nextValues) {
      let result: FuzzyEqualSimilarity;

      try {
        const totalSimilarity: FuzzyEqualComparison = fuzzyEqual(currentValue.node.obj, nextValue.node.obj);
        result = totalSimilarity.propertyCount === 0 ? {similarity: 0, currentValueNodeId: currentValue.nodeId, nextValueNodeId: nextValue.nodeId} : {similarity: totalSimilarity.matching / totalSimilarity.propertyCount, currentValueNodeId: currentValue.nodeId, nextValueNodeId: nextValue.nodeId};
      } catch {
        result = {similarity: 0, currentValueNodeId: currentValue.nodeId, nextValueNodeId: nextValue.nodeId};
      }

      if (result.similarity >= input.threshold) {
        await writeToStream(process.stdout, JSON.stringify(result));
      }
    }
  }

  await writeToStream(process.stdout, JSON.stringify({info: `[PID: ${process.pid}] Progress: 100%`}) + '\n');
  await writeToStream(process.stdout, JSON.stringify({finished: true}));
});
