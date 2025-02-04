import { Field, Poseidon, MerkleTree, ZkProgram, UInt32, Struct, MerkleWitness, Circuit, SelfProof, Proof } from 'o1js';


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
        leaf_history: Array(Field),
        root_history: Array(Field),
    }
) { }

class CircuitInputs extends Struct({
    tree: CustomTree,
    root: Field,
    new_input: Field,
}) { }

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
                // commit the current, and previous root and the new leaf
                return { publicOutput: new InsertPublicOutput({ leaf_history: [publicInput.new_input], root_history: [new_tree.hash()] }) };
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
let zero_leaf = Field(0);
let leafs = [zero_leaf];
// construct the tree with one leaf in it
let Tree = new CustomTree({ leafs: leafs });
// hash the initial tree root
let initial_root = Tree.hash();
let first_input = new CircuitInputs({ tree: Tree, root: initial_root, new_input: Field(22222) })
const { proof } = await InsertProgram.prove_insert(first_input);
let new_leaf = Field(11111);
Tree.insert(new_leaf);
let second_input = new CircuitInputs({ tree: Tree, root: initial_root, new_input: new_leaf })
/*const { proof: second_proof } = await SimpleProgram.recursive(second_input, proof);
console.log("Second Proof: ", second_proof);*/


