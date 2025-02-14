import * as util from 'node:util';
import {
  type BaseComparisonNodesInput,
  type BaseDisjunctNodesPresenter,
  type BaseDisjunctNodesPresenterOptions,
  type DisjunctTracker,
} from '../types/index.js';
import {
  JsonChunkWriter,
} from '../helpers/index.js';

export class DisjunctNodesPresenter<T extends BaseComparisonNodesInput> implements BaseDisjunctNodesPresenter {
  /**
   * Stores the current nodes to compare.
   */
  private currentValues = new Map() as T;

  /**
   * Stores the next nodes to compare.
   */
  private nextValues = new Map() as T;

  /**
   * Stores the options.
   */
  private options: BaseDisjunctNodesPresenterOptions = {
    filePath: '',
    fileName: '',
  };

  /**
   * Saves disjunct nodes.
   */
  private disjunctNodes: DisjunctTracker = {
    currentNodeId: new Set(),
    nextNodeId: new Set(),
  };

  /**
   * JSON writer.
   */
  private readonly jsonWriter = new JsonChunkWriter();

  /**
   * @inheritdoc
   */
  public initialize(currentValues: T, nextValues: T, input: DisjunctTracker, options: BaseDisjunctNodesPresenterOptions): void {
    this.currentValues = currentValues;
    this.nextValues = nextValues;
    this.disjunctNodes = input;
    this.options = options;
    this.jsonWriter.initialize({outputDir: this.options.filePath, outputFile: this.options.fileName});
  }

  /**
   * @inheritdoc
   */
  async report(): Promise<void> {
    for (const value of this.disjunctNodes.currentNodeId.values()) {
      try {
        await this.jsonWriter.write({
          type: 'currentNode',
          nextValue: util.inspect(this.currentValues.get(value) ?? {}, {
            compact: true, depth: 20, breakLength: Infinity, colors: false,
          }),
        });
      } catch {}
    }

    for (const value of this.disjunctNodes.nextNodeId.values()) {
      try {
        await this.jsonWriter.write({
          type: 'nextNode',
          nextValue: util.inspect(this.nextValues.get(value) ?? {}, {
            compact: true, depth: 20, breakLength: Infinity, colors: false,
          }),
        });
      } catch {}
    }

    await this.jsonWriter.close();
  }
}
