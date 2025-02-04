import { Field, MerkleTree, MerkleWitness, Poseidon, ZkProgram, Struct, SelfProof, assert } from "o1js";

const TREE_DEPTH = 8;

class TreeWitness extends MerkleWitness(TREE_DEPTH) { }

class Operation extends Struct({
    kind: Field,
    // optional value, set to ZERO_VALUE for read
    value: Field,
    key: Field
}) { };

class Operations extends Struct({
    operations: Array(Operation)
}) { };

const ZERO_VALUE: Field = Field(0);
const DEFAULT_VALUE: Field = Field(9999999);
const DEFAULT_KEY: Field = Field(0);

// merkle tree of depth 8, initialized once
let tree = new MerkleTree(TREE_DEPTH);

// define a set of operations
let operations: Operations = new Operations({
    operations: [new Operation({
        kind: Field(0),
        value: DEFAULT_VALUE,
        key: Field(0)
    }), new Operation({
        kind: Field(1),
        value: ZERO_VALUE,
        key: DEFAULT_KEY
    })]
});

class PublicInput extends Struct({
    witness: TreeWitness,
    leaf: Field,
    root: Field
}) { }

const TreeProgram = ZkProgram({
    name: 'mina-recursive-tree-program',
    publicInput: PublicInput,
    methods: {

        prove_insert: {
            privateInputs: [],
            async method(publicInput: PublicInput) {
                let calculated_root = publicInput.witness.calculateRoot(publicInput.leaf);
                calculated_root.assertEquals(publicInput.root);
            },
        },
        prove_insert_recursive: {
            privateInputs: [],
            async method() {

            },
        },
        prove_read: {
            privateInputs: [],
            async method() {
            },
        },
        prove_read_recursive: {
            privateInputs: [],
            async method() {
            },
        },
    },
});


const { verificationKey } = await TreeProgram.compile();
for (const [idx, operation] of operations.operations.entries()) {
    // operation is Insert
    if (operation.kind.equals(Field(0))) {
        tree.setLeaf(operation.key.toBigInt(), operation.value);
        let witness: TreeWitness = new TreeWitness(tree.getWitness(operation.key.toBigInt()));
        let root: Field = tree.getRoot();
        let circuitInputs = new PublicInput({
            witness: witness,
            leaf: operation.value,
            root: root
        });
        if (idx == 0) {
            const { proof } = await TreeProgram.prove_insert(circuitInputs);
        }
    }
    // operation is Read
    else {
        assert(operation.value == ZERO_VALUE);
    }
}

console.log("OK!");