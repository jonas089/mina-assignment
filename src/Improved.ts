import { Field, MerkleTree, MerkleWitness, Poseidon, ZkProgram, Struct, SelfProof, assert } from "o1js";

const TREE_DEPTH = 8;

class TreeWitness extends MerkleWitness(TREE_DEPTH) { }

enum OperationType {
    // Field(0)
    insertion,
    // Field(1)
    query
}

class Operation extends Struct({
    kind: Field,
    // optional value, set to ZERO_VALUE for read
    value: Field,
    key: Field
}) { };

const ZERO_VALUE: Field = Field(0);
const DEFAULT_VALUE: Field = Field(9999999);
const DEFAULT_KEY: Field = Field(15000);

// merkle tree of depth 8, initialized once
let tree = new MerkleTree(TREE_DEPTH);

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

class PublicInput extends Struct({
    witness: TreeWitness,
    leaf: Field,
    root: Field
}) { }

const TreeProgram = ZkProgram({
    name: 'mina-recursive-tree-program',
    methods: {
        prove_insert: {
            privateInputs: [],
            async method() {
            },
        },
        recursive_insert: {
            privateInputs: [],
            async method() {

            },
        }
    },
});


for (const operation of operations) {
    // operation is Insert
    if (operation.kind == Field(OperationType.insertion)) {
        tree.setLeaf(operation.key.toBigInt(), operation.value);
        let witness: TreeWitness = new TreeWitness(tree.getWitness(operation.key.toBigInt()));
        let root: Field = tree.getRoot();
        let circuitInputs = new PublicInput({
            witness: witness,
            leaf: operation.value,
            root: root
        });

    }
    // operation is Read
    else {
        assert(operation.value == ZERO_VALUE);
    }
}