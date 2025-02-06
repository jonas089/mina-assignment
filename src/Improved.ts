import { Field, MerkleTree, MerkleWitness, Poseidon, ZkProgram, Struct, SelfProof, assert, Provable, Proof } from "o1js";

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


const TreeProgram = ZkProgram({
    name: 'mina-recursive-tree-program',
    publicInput: PublicInput,
    publicOutput: PublicOutput,
    methods: {
        prove_witness: {
            privateInputs: [],
            async method(publicInput: PublicInput) {
                let calculated_root = publicInput.witness.calculateRoot(publicInput.leaf);
                calculated_root.assertEquals(publicInput.root);
                return { publicOutput: new PublicOutput({ outputRoot: calculated_root }) }
            },
        },
        prove_witness_recursive: {
            privateInputs: [SelfProof],
            async method(publicInput: PublicInput, previousProof: SelfProof<PublicInput, PublicOutput>) {
                previousProof.verify();
                let calculated_root = publicInput.witness.calculateRoot(publicInput.leaf);
                calculated_root.assertEquals(publicInput.root);
                // Initially I thought this may be an issue because I also update the output root in the case of a read, but 
                // each read will always have the root of the most recent insert, therefore this is actually not an issue.
                return { publicOutput: new PublicOutput({ outputRoot: calculated_root }) }
            },
        },
    },
});


const { verificationKey } = await TreeProgram.compile();

async function recursive_prover(
    operation: Operation,
    idx: number,
    current_proof: Proof<PublicInput, PublicOutput>
): Promise<Proof<PublicInput, PublicOutput>> {
    if (operation.key.equals(Field(0))) {
        tree.setLeaf(operation.key.toBigInt(), operation.value);
        let witness: TreeWitness = new TreeWitness(tree.getWitness(operation.key.toBigInt()));
        let root: Field = tree.getRoot();
        let circuitInputs = new PublicInput({
            witness: witness,
            leaf: operation.value,
            root: root
        });
        // Recursive case: chain proofs together
        const { proof } = await TreeProgram.prove_witness_recursive(circuitInputs, current_proof);
        return proof;
    }
    else {
        let leaf_read: Field = tree.getLeaf(operation.key.toBigInt());
        let witness: TreeWitness = new TreeWitness(tree.getWitness(operation.key.toBigInt()));
        let root: Field = tree.getRoot();
        let circuitInputs = new PublicInput({
            witness: witness,
            leaf: leaf_read,
            root: root
        });
        // Recursive case: chain proofs together
        const { proof } = await TreeProgram.prove_witness_recursive(circuitInputs, current_proof);
        return proof;
    }
}

async function handle_first_operation(operation: Operation): Promise<Proof<PublicInput, PublicOutput>> {
    if (operation.kind.equals(Field(0))) {
        tree.setLeaf(operation.key.toBigInt(), operation.value)
        let witness: TreeWitness = new TreeWitness(tree.getWitness(operation.key.toBigInt()));
        let root: Field = tree.getRoot();
        let circuitInputs = new PublicInput({
            witness: witness,
            leaf: operation.value,
            root: root
        });
        const { proof } = await TreeProgram.prove_witness(circuitInputs);
        return proof;
    }
    else {
        // read a leaf value
        let leaf_read: Field = tree.getLeaf(operation.key.toBigInt());
        let witness: TreeWitness = new TreeWitness(tree.getWitness(operation.key.toBigInt()));
        let root: Field = tree.getRoot();
        let circuitInputs = new PublicInput({
            witness: witness,
            leaf: leaf_read,
            root: root
        });
        const { proof } = await TreeProgram.prove_witness(circuitInputs);
        return proof;
    }
}

let current_proof = await handle_first_operation(operations.operations[0]);
for (const [idx, operation] of operations.operations.entries()) {
    if (idx == 0) {
        continue;
    }
    current_proof = await recursive_prover(operation, idx, current_proof);
}


console.log("Final Proof: ", current_proof);