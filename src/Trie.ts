import { Field, Poseidon, MerkleTree, ZkProgram, UInt32, Struct, MerkleWitness, Circuit, SelfProof, Proof, Provable, assert } from 'o1js';


// a simplified mock tree that works with field elements
class CustomTree extends Struct({
    leafs: Array(Field)
}) {
    insert(element: Field): CustomTree {
        // Return a new tree instance instead of modifying the existing one
        return new CustomTree({ leafs: [...this.leafs, element] });
    }
    hash(): Field {
        return Poseidon.hash(this.leafs);
    }
}

class InsertPublicOutput extends Struct(
    {
        // can hold a maximum of 10 operations
        leaf_history: Provable.Array(Field, 10),
        root_history: Provable.Array(Field, 10),
    }
) { }

class CircuitInputs extends Struct({
    tree: CustomTree,
    root: Field,
    new_input: Field,
}) { }

function padArray(arr: Field[], length: number, padValue: Field): Field[] {
    let padded: Field[] = [];
    for (const element of arr) {
        padded.push(element)
    }
    while (padded.length < 10) {
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


const InsertProgram = ZkProgram({
    name: 'mina-recursive-tree-program',
    publicInput: CircuitInputs,
    publicOutput: InsertPublicOutput,
    methods: {
        prove_insert: {
            privateInputs: [],
            async method(publicInput: CircuitInputs) {
                let input_hash = Poseidon.hash([publicInput.new_input]);
                let new_tree = publicInput.tree.insert(input_hash);
                let new_leaf_history = [publicInput.new_input];
                let new_root_history = [new_tree.hash()];
                new_leaf_history = padArray(new_leaf_history, 10, Field(0));
                new_root_history = padArray(new_root_history, 10, Field(0));
                // commit the current, and previous root and the new leaf
                return { publicOutput: new InsertPublicOutput({ leaf_history: new_leaf_history, root_history: new_root_history }) };
            },
        },
        recursive_insert: {
            privateInputs: [SelfProof],
            async method(publicInput: CircuitInputs, previous_proof: SelfProof<CircuitInputs, InsertPublicOutput>) {
                previous_proof.verify();
                let input_hash = Poseidon.hash([publicInput.new_input]);
                let new_tree = publicInput.tree.insert(input_hash);
                let new_leaf_history = [...previous_proof.publicOutput.leaf_history, publicInput.new_input];
                let new_root_history = [...previous_proof.publicOutput.root_history, new_tree.hash()];
                new_leaf_history = trimArray(new_leaf_history, Field(0));
                new_root_history = trimArray(new_root_history, Field(0));
                new_leaf_history = padArray(new_leaf_history, 10, Field(0));
                new_root_history = padArray(new_root_history, 10, Field(0));
                assert(new_leaf_history.length == 10);
                assert(new_root_history.length == 10);
                // assuming the previous proof is valid, commit the current, and previous root and the new leaf
                return { publicOutput: new InsertPublicOutput({ leaf_history: new_leaf_history, root_history: new_root_history }) };
            },
        }
    },
});

const { verificationKey } = await InsertProgram.compile();
// each leaf is an arbitrarily sized leaf's poseidon hash
// therefore a leaf can represent any data.
// initialize with an empty leaf for simplicity sake
let zero_leaf = Field(99999999999);
let leafs = [zero_leaf];
// construct the tree with one leaf in it
let Tree = new CustomTree({ leafs: leafs });
// hash the initial tree root
let initial_root = Tree.hash();
let first_input = new CircuitInputs({ tree: Tree, root: initial_root, new_input: Field(22222) })
const { proof } = await InsertProgram.prove_insert(first_input);
console.log("Ok, first proof!");
let new_leaf = Field(11111);
Tree.insert(new_leaf);
let second_input = new CircuitInputs({ tree: Tree, root: initial_root, new_input: new_leaf })
const { proof: second_proof } = await InsertProgram.recursive_insert(second_input, proof);
console.log("Ok, recursive proof!");

