import util from 'node:util';
import {
  type BaseComparisonNodesInput,
  type BaseDisjunctNodesPresenterOptions,
  type BasePerfectMatchPresenter,
  type BasePerfectMatchPresenterOptions,
  type PerfectMatchTracker,
} from '../types/index.js';
import {
  JsonChunkWriter,
} from '../helpers/index.js';

export class PerfectMatchPresenter<T extends BaseComparisonNodesInput> implements BasePerfectMatchPresenter {
  /**
   * Stores the current nodes to compare.
   */
  private currentValues = new Map() as T;

  /**
   * Stores the next nodes to compare.
   */
  private nextValues = new Map() as T;

  /**
   * Saves perfect matches.
   */
  private perfectMatch: Map<string, PerfectMatchTracker> = new Map<string, PerfectMatchTracker>();

  /**
   * Stores the options.
   */
  private options: BaseDisjunctNodesPresenterOptions = {
    filePath: '',
    fileName: '',
  };

  /**
   * JSON writer.
   */
  private readonly jsonWriter = new JsonChunkWriter();

  /**
   * @inheritdoc
   */
  public initialize(currentValues: T, nextValues: T, input: Map<string, PerfectMatchTracker>, options: BasePerfectMatchPresenterOptions): void {
    this.currentValues = currentValues;
    this.nextValues = nextValues;
    this.perfectMatch = input;
    this.options = options;
    this.jsonWriter.initialize({outputDir: this.options.filePath, outputFile: this.options.fileName});
  }

  /**
   * @inheritdoc
   */
  async report(): Promise<void> {
    for (const [key, value] of this.perfectMatch.entries()) {
      await this.jsonWriter.write({
        currentNodeIds: [...value.currentNodeId],
        nextNodeIds: [...value.nextNodeId],
        currentValues: [...value.currentNodeId].map(id => util.inspect(this.currentValues.get(id), {
          compact: true, depth: 20, breakLength: Infinity, colors: false,
        })),
        nextValues: [...value.nextNodeId].map(id => util.inspect(this.nextValues.get(id), {
          compact: true, depth: 20, breakLength: Infinity, colors: false,
        })),
      });
    }

    await this.jsonWriter.close();
  }
}
