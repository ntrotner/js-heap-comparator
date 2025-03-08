import util from 'node:util';
import {
  type BaseComparisonNodesInput,
  type BaseDisjunctNodesPresenterOptions,
  type BaseNextBestMatchPresenter,
  type BaseNextBestMatchPresenterOptions,
  type NextBestMatchTracker,
} from '../types/index.js';
import {
  getDefaultValueOfNextBestMatchTracker,
  JsonChunkWriter,
} from '../helpers/index.js';

export class NextBestMatchPresenter<T extends BaseComparisonNodesInput> implements BaseNextBestMatchPresenter {
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
  private nextBestMatch: NextBestMatchTracker = getDefaultValueOfNextBestMatchTracker();

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
  public initialize(currentValues: T, nextValues: T, input: NextBestMatchTracker, options: BaseNextBestMatchPresenterOptions): void {
    this.currentValues = currentValues;
    this.nextValues = nextValues;
    this.nextBestMatch = input;
    this.options = options;
    this.jsonWriter.initialize({outputDir: this.options.filePath, outputFile: this.options.fileName});
  }

  /**
   * @inheritdoc
   */
  async report(): Promise<void> {
    for (const similarity of Object.keys(this.nextBestMatch)) {
      for (const [key, value] of this.nextBestMatch[similarity as unknown as keyof NextBestMatchTracker].entries()) {
        await this.jsonWriter.write({
          similarity,
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
    }

    await this.jsonWriter.close();
  }
}
