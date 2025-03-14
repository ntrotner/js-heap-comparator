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
        const valueToPrint = this.currentValues.get(value);
        // @ts-expect-error: incomplete typing of obj/value, should be fixed someday
        const serializedValue: unknown = 'obj' in (valueToPrint ?? {}) ? valueToPrint?.obj : ('value' in (valueToPrint ?? {}) ? valueToPrint?.value : 'undefined');

        await this.jsonWriter.write({
          type: 'currentNode',
          nextValue: util.inspect({n: valueToPrint?.n, size: valueToPrint?.size, serializedValue}, {
            compact: true, depth: 20, breakLength: Infinity, colors: false,
          }),
        });
      } catch {}
    }

    for (const value of this.disjunctNodes.nextNodeId.values()) {
      try {
        const valueToPrint = this.nextValues.get(value);
        // @ts-expect-error: incomplete typing of obj/value, should be fixed someday
        const serializedValue: unknown = 'obj' in (valueToPrint ?? {}) ? valueToPrint?.obj : ('value' in (valueToPrint ?? {}) ? valueToPrint?.value : undefined);

        await this.jsonWriter.write({
          type: 'nextNode',
          nextValue: util.inspect({n: valueToPrint?.n, size: valueToPrint?.size, serializedValue}, {
            compact: true, depth: 20, breakLength: Infinity, colors: false,
          }),
        });
      } catch {}
    }

    await this.jsonWriter.close();
  }
}
