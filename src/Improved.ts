import { Field, MerkleTree, Poseidon, ZkProgram, Struct, SelfProof, assert } from "o1js";

enum OperationType {
    // Field(0)
    insertion,
    // Field(1)
    query
}

class Operation extends Struct({
    kind: Field,
    // optional value, not required for insert
    value: Field,
    // optional key, not required for read
    key: Field
}) { };

const ZERO_VALUE: Field = Field(0);
const DEFAULT_VALUE: Field = Field(9999999);
const DEFAULT_KEY: Field = Field(15000);

// merkle tree of depth 8, initialized once
let tree = new MerkleTree(8);

// define a set of operations
let operations: Operation[] = [new Operation({
    kind: Field(OperationType.insertion),
    value: DEFAULT_VALUE,
    key: Field(0)
}), new Operation({
    kind: Field(OperationType.query),
    value: Field(0),
    key: DEFAULT_KEY
})]
