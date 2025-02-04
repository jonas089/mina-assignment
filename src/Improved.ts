import { Field, MerkleTree, MerkleWitness, Poseidon, ZkProgram, Struct, SelfProof, assert, Provable } from "o1js";

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

class PublicOutput extends Struct({
    // can't read more than this
    outputRoot: Field
}) { }



function padArray(arr: Field[]): Field[] {
    let padded: Field[] = [];
    for (const element of arr) {
        padded.push(element)
    }
    while (padded.length < 2 ** TREE_DEPTH) {
        padded.push(Field(0))
    }
    return padded;
}

function trimArray(arr: Field[], padValue: Field): Field[] {
    let output: Field[] = []
    for (const element of arr) {
        if (!padValue.equals(element)) {
            output.push(element)
        }
    }
    return output;
}


const TreeProgram = ZkProgram({
    name: 'mina-recursive-tree-program',
    publicInput: PublicInput,
    publicOutput: PublicOutput,
    methods: {

        prove_insert: {
            privateInputs: [],
            async method(publicInput: PublicInput) {
                let calculated_root = publicInput.witness.calculateRoot(publicInput.leaf);
                calculated_root.assertEquals(publicInput.root);
                let read_values_list: Field[] = [];
                read_values_list = padArray(read_values_list);
                return { publicOutput: new PublicOutput({ outputRoot: calculated_root }) }

            },
        },
        prove_insert_recursive: {
            privateInputs: [SelfProof],
            async method(publicInput: PublicInput, previousProof: SelfProof<PublicInput, PublicOutput>) {
                previousProof.verify();
                let calculated_root = publicInput.witness.calculateRoot(publicInput.leaf);
                calculated_root.assertEquals(publicInput.root);
                return { publicOutput: new PublicOutput({ outputRoot: calculated_root }) }
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