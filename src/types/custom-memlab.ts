export type ObjectRecord = {
  n: number;
  size: number;
  shallowSize: number;
  ids: number[];
  obj: {
    class: string;
    object: Record<
    string | number,
    string | number | Array<string | number | undefined> | boolean | undefined
    >;
  };
};

export type PrimitiveRecord = {
  n: number;
  size: number;
  shallowSize: number;
  value: string | number | boolean | undefined;
};

export type ObjectAggregationMap = Record<string, ObjectRecord>;
export type ObjectMap = Map<number, ObjectRecord>;
export type PrimitiveTypeMap = Map<number, PrimitiveRecord>;
export type IgnoredNodesMap = Map<number, string | number>;

export enum CustomNodeType {
  ObjectConstructor = 'OBJECT_CONSTRUCTOR',
  NaNValue = 'NAN_VALUE_SANITIZED',
  CircularReference = 'CIRCULAR_REFERENCE_SANITIZED',
}
