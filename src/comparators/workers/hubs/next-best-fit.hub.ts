import {
  Worker,
} from 'node:worker_threads';
import {
  type FuzzyEqualSimilarity,
  type NodeInput,
} from '../../../types/index.js';
import {
  type NextBestFitResponse,
} from '../types/next-best-fit.js';
import {
  Logger,
  writeToStream,
} from '../../../helpers/index.js';

type Options = {
  threads: number;
  threshold: number;
  propertyThreshold: number;
};

export class NextBestFitHub {
  constructor(
    private readonly currentValues: NodeInput[],
    private readonly nextValues: NodeInput[],
    private readonly options: Options,
  ) {}

  /**
   * Run the comparison between the current and next values and orchestrates the workers.
   */
  public async runComparison(): Promise<FuzzyEqualSimilarity[]> {
    const spokes = [];
    const chunkSize = Math.ceil(this.currentValues.length / this.options.threads);
    const chunks = [];

    for (let i = 0; i < this.currentValues.length; i += chunkSize) {
      chunks.push(this.currentValues.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      spokes.push(this.runValueComparison(chunk));
    }

    const spokesResult = await Promise.all(spokes);
    return spokesResult.flat();
  }

  /*+
   * Run the comparison between the current and next values.
   */
  private async runValueComparison(currentValueChunk: NodeInput[]): Promise<FuzzyEqualSimilarity[]> {
    return new Promise(async resolve => {
      const results: FuzzyEqualSimilarity[] = [];

      try {
        // TODO: adjust the path to the spoke file
        const worker = new Worker('./lib/comparators/workers/spokes/next-best-fit.spoke.js', {stdout: true, stdin: true, stderr: true});

        worker.stdout.addListener('data', async (data: string) => {
          try {
            const parsedData = JSON.parse(data.toString()) as NextBestFitResponse;
            if (parsedData.finished) {
              await worker.terminate();
              resolve(results);
            } else if (parsedData.info) {
              Logger.info(parsedData.info);
            } else {
              results.push(parsedData);
            }
          } catch {}
        });

        for (const currentValue of currentValueChunk) {
          await writeToStream(worker.stdin!, JSON.stringify({currentValues: [currentValue], nextValues: []}));
        }

        for (const nextValue of this.nextValues) {
          await writeToStream(worker.stdin!, JSON.stringify({currentValues: [], nextValues: [nextValue]}));
        }

        await writeToStream(worker.stdin!, JSON.stringify({
          currentValues: [],
          nextValues: [],
          threshold: this.options.threshold,
          propertyThreshold: this.options.propertyThreshold,
        }));
      } catch (error) {
        Logger.error(String(error));
        resolve(results);
      }
    });
  }
}
