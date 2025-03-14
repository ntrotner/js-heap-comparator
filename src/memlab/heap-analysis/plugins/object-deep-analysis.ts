import Memlab, {
  type HeapAnalysisOptions
} from 'memlab';
import MemlabCore, {
  type IHeapEdge,
  type IHeapNode,
  type IHeapSnapshot,
} from '@memlab/core';
import {
  CustomNodeType,
  type IgnoredNodesMap,
  type ObjectAggregationMap,
  type ObjectMap,
  type PrimitiveRecord, PrimitiveTypeMap
} from "../../../types/index.js";
import hash from 'object-hash';
import {
  cleanCircularReferences, Logger
} from "../../../helpers/index.js";

// @ts-ignore
export class ObjectDeepAnalysis extends Memlab.ObjectShallowAnalysis {
  // START CUSTOM: Copy from 'packages/heap-analysis/src/plugins/ObjectShallowAnalysis.ts'
  async process(options: HeapAnalysisOptions): Promise<void> {
    const snapshot = await Memlab.loadHeapSnapshot(options);
    const objectMap = this.getPreprocessedObjectMap(snapshot);
    // START CUSTOM: ignore calculation of object patterns statistics
    // this.calculateobjectPatternsStatistics(objectMap);
    // this.calculateTopDuplicatedObjectsInCount(objectMap);
    // this.calculateTopDuplicatedObjectsInSize(objectMap);
    // this.print();
    // END CUSTOM: ignore calculation of object patterns statistics
    // CUSTOM: save object map
    this.uniqueObjectsMap = objectMap;
  }

  /**
   * Check if the node should be ignored
   *
   * @param node
   * @private
   */
  private shouldIgnoreNode(node: IHeapNode): boolean {
    let hasAHiddenReferrer = false;
    node.forEachReferrer((edge: IHeapEdge) => {
      if (edge.type === 'hidden') {
        hasAHiddenReferrer = true;
        return {stop: true};
      }
    });

    // START CUSTOM: do not ignore arrays
    if (node.type === 'array' || (node.name === 'Array' && node.type === 'object')) {
      return false;
    }
    // END CUSTOM: do not ignore arrays

    // START CUSTOM: do not ignore objects
    if ((node.name === 'Object' && node.type === 'object')) {
      return false;
    }
    // END CUSTOM: do not ignore objects

    return !(
      !hasAHiddenReferrer &&
      node.type === 'object' &&
      node.name !== 'Array' &&
      node.name !== 'ArrayBuffer' &&
      node.name !== 'Set' &&
      node.name !== 'Map' &&
      !node.name.startsWith('Window') &&
      !node.name.startsWith('system /')
    );
  }

  /**
   * Preprocess the object map
   *
   * @param snapshot
   * @private
   */
  private getPreprocessedObjectMap(snapshot: IHeapSnapshot) {
    // CUSTOM: ignore logging
    //info.overwrite('building object map...');
    const objectMap = Object.create(null);
    // CUSTOM: track node to object reference
    const objectMapRef: ObjectMap = new Map();

    snapshot.nodes.forEach((node: IHeapNode) => {
      if (this.shouldIgnoreNode(node)) {
        // CUSTOM: track node to primitive type reference
        this.registerIgnoredNode(node);
        return;
      }

      const obj = this.nodeToObject(node);
      // CUSTOM: use object hash as key
      // const value = JSON.stringify(obj);
      const value = hash(obj as any, {
        respectFunctionProperties: false,
        respectFunctionNames: false,
        respectType: false,
        unorderedArrays: true,
        ignoreUnknown: true,
      });
      objectMap[value] = objectMap[value] || {
        n: 0,
        size: 0,
        ids: [],
        // CUSTOM: store object instead of string
        // obj: JSON.stringify(obj),
        obj: obj,
      };
      const record = objectMap[value];
      ++record.n;
      record.size += node.retainedSize;
      record.ids.push(node.id);
      // CUSTOM: track node to object reference
      objectMapRef.set(node.id, objectMap[value]);
      // CUSTOM: set shallow size
      record.shallowSize = node.self_size;
    });
    // CUSTOM: fill shallow objects with references
    this.deepFillObjectMap(snapshot, objectMapRef);

    return objectMap;
  }

  /**
   * Convert a node to an object
   *
   * @param node
   * @private
   */
  private nodeToObject(node: IHeapNode): unknown {
    type AlphaNumeric = string | number;
    const result: Record<
      AlphaNumeric,
      AlphaNumeric | Array<AlphaNumeric | null> | boolean | null
    > = {};

    for (const edge of node.references) {
      if (edge.type === 'property' && edge.name_or_index != '__proto__') {
        const key = edge.name_or_index;
        const value = edge.toNode;
        if (MemlabCore.utils.isStringNode(value)) {
          result[key] = MemlabCore.utils.getStringNodeValue(edge.toNode);
        } else if (value.type === 'number') {
          result[key] = MemlabCore.utils.getNumberNodeValue(edge.toNode);
          // START CUSTOM: add additional checks for types
          if (Number.isNaN(result[key])) {
            // NaN is special :) (NaN !== NaN)
            result[key] = CustomNodeType.NaNValue;
          }
          // END CUSTOM: add additional checks for types
        } else if (value.type === 'boolean') {
          result[key] = MemlabCore.utils.getBooleanNodeValue(edge.toNode);
        } else {
          // shallow analysis, just put the id as a string
          result[key] = 'REFERENCE_' + value.id;
        }

        // START CUSTOM: add additional checks for types
        if (['array', 'Array'].includes(value.name) || value.type === 'array') {
          result[key] = value.references.filter(reference => reference.type === 'element').map(edge => 'REFERENCE_' + edge.toNode.id);
        } else if (value.type === 'hidden' || value.type === 'native' || value.type === 'synthetic' || value.type === 'symbol') {
          delete result[key];
        }
        // END CUSTOM: add additional checks for types
      }
    }
    return {class: node.name, object: result};
  }
  // END CUSTOM: Copy from 'packages/heap-analysis/src/plugins/ObjectShallowAnalysis.ts'

  /**
   * track node to primitive type reference
   */
  private ignoredNodesMap: IgnoredNodesMap = new Map();

  /**
   * track node to primitive type reference with complete metadata
   */
  private ignoredNodesMapComplete: Map<number, PrimitiveRecord> = new Map();

  /**
   * saves object values as keys for aggregation
   */
  private uniqueObjectsMap: ObjectAggregationMap | undefined;

  /**
   * Stores the deep filled objects
   */
  private deepFilledObjects: ObjectMap | undefined;

  /**
   * Returns the unique objects map
   */
  public getUniqueObjectsMap(): ObjectAggregationMap | undefined {
    return this.uniqueObjectsMap;
  }

  /**
   * Returns the deep filled objects
   */
  public getDeepFilledObjects(): ObjectMap | undefined {
    return this.deepFilledObjects;
  }

  /**
   * Returns the ignored nodes
   */
  public getPrimitiveNodes(): PrimitiveTypeMap | undefined {
    return this.ignoredNodesMapComplete;
  }

  /**
   * Convert some shallow to deep objects
   *
   * @param snapshot
   * @param objectMapRef
   */
  private deepFillObjectMap(snapshot: IHeapSnapshot, objectMapRef: ObjectMap): void {
    [...objectMapRef.entries()].forEach(([_, object]) => {
      const liveObject = object.obj.object;
      const liveObjectEntries = Object.entries(liveObject);
      liveObjectEntries.forEach(([key, value]) => {
        if (typeof value === 'string' && value.startsWith('REFERENCE_')) {
          const refNodeId = parseInt(value.replace('REFERENCE_', ''));
          const refObject = objectMapRef.get(refNodeId);
          const refPrimitive = this.ignoredNodesMap.get(refNodeId);

          if (objectMapRef.has(refNodeId)) {
            Object.assign(liveObject, {[key]: refObject!.obj.object});
          } else if (this.ignoredNodesMap.has(refNodeId)) {
            Object.assign(liveObject, {[key]: refPrimitive});
          }
        } else if (Array.isArray(value)) {
          const refObjects = value.map(refNodeValue => {
            if (typeof refNodeValue === 'string' && refNodeValue.startsWith('REFERENCE_')) {
              refNodeValue = parseInt(refNodeValue.replace('REFERENCE_', ''));
              const refObject = objectMapRef.get(refNodeValue);
              const refPrimitive = this.ignoredNodesMap.get(refNodeValue);

              if (objectMapRef.has(refNodeValue)) {
                return refObject!.obj.object;
              } else if (this.ignoredNodesMap.has(refNodeValue)) {
                return refPrimitive;
              }
            } else if (typeof refNodeValue === 'string') {
              return refNodeValue;
            }
          });

          Object.assign(liveObject, {[key]: refObjects});
        } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          Object.assign(liveObject, {[key]: value});
        }
      });

      if (typeof object.obj.object === 'object') {
        cleanCircularReferences(object.obj.object, CustomNodeType.CircularReference);
      }
    });

    this.deepFilledObjects = objectMapRef;
  }

  /**
   * Track ignored nodes to deep fill objects
   *
   * @param node
   */
  private registerIgnoredNode(node: IHeapNode): void {
    if (node.type === 'string' || node.type === 'native') {
      this.ignoredNodesMap.set(node.id, node.name);
    } else if (node.type === 'closure' || node.type === 'hidden') {
      this.ignoredNodesMap.set(node.id, node.type);
    } else if (node.type === 'number') {
      this.ignoredNodesMap.set(node.id, MemlabCore.utils.getNumberNodeValue(node) || 0);
    } else if (node.type === 'object') {
      this.ignoredNodesMap.set(node.id, node.name);
    } else if (
      (node.name === '(concatenated string)' && node.type === 'concatenated string') ||
      (node.name === '(sliced string)' && node.type === 'sliced string')
    ) {
      const modifiedString = node.references
        .filter(({type}) => type !== 'hidden')
        .map(({toNode}) => {
        if (toNode.type === 'string') {
          return toNode.name;
        }
        return '';
        })
        .join('');

      this.ignoredNodesMap.set(node.id, modifiedString);
    } else if (node.type === 'code') {
      this.ignoredNodesMap.set(node.id, node.name);
    } else if (node.type === 'synthetic') {
      this.ignoredNodesMap.set(node.id, node.name);
    } else if (node.type === 'object shape') {
      this.ignoredNodesMap.set(node.id, node.name);
    } else if (node.type === 'regexp') {
      this.ignoredNodesMap.set(node.id, node.name);
    } else if (node.type === 'symbol') {
      this.ignoredNodesMap.set(node.id, node.name);
    } else {
      Logger.error('Unknown node type:', node.toJSONString());
      this.ignoredNodesMap.set(node.id, node.toJSONString());
    }

    this.ignoredNodesMapComplete.set(node.id, { n: node.id, size: node.retainedSize, shallowSize: node.self_size, value: this.ignoredNodesMap.get(node.id) });
  }
}
