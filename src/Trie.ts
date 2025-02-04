import { Field, Poseidon, MerkleTree, ZkProgram, UInt32, Struct, MerkleWitness, Circuit, SelfProof, Proof } from 'o1js';


class PublicOutput extends Struct(
    {
        new_leaf: Field,
        current_root: Field,
        previous_root: Field,
    }
) { }

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

class CircuitInputs extends Struct({
    tree: CustomTree,
    root: Field,
    new_input: Field,
}) { }

const SimpleProgram = ZkProgram({
    name: 'mina-recursive-tree-program',
    publicInput: CircuitInputs,
    publicOutput: PublicOutput,
    methods: {
        prove: {
            privateInputs: [],
            async method(publicInput: CircuitInputs) {
                let previous_root = publicInput.tree.hash();
                let input_hash = Poseidon.hash([publicInput.new_input]);
                let new_tree = publicInput.tree.insert(input_hash);
                // commit the current, and previous root and the new leaf
                return { publicOutput: new PublicOutput({ new_leaf: publicInput.new_input, current_root: new_tree.hash(), previous_root: previous_root }) };
            },
        },
        recursive: {
            privateInputs: [SelfProof],
            async method(publicInput: CircuitInputs, previous_proof: SelfProof<CircuitInputs, PublicOutput>) {
                let previous_root = publicInput.tree.hash();
                previous_root.assertEquals(previous_proof.publicOutput.current_root);
                previous_proof.verify();
                let input_hash = Poseidon.hash([publicInput.new_input]);
                let new_tree = publicInput.tree.insert(input_hash);
                // assuming the previous proof is valid, commit the current, and previous root and the new leaf
                return { publicOutput: new PublicOutput({ new_leaf: publicInput.new_input, current_root: new_tree.hash(), previous_root: previous_root }) };
            },
        }
    },
});

const { verificationKey } = await SimpleProgram.compile();
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
const { proof } = await SimpleProgram.prove(first_input);

let new_leaf = Field(11111);
Tree.insert(new_leaf);
let second_input = new CircuitInputs({ tree: Tree, root: initial_root, new_input: new_leaf })
const { proof: second_proof } = await SimpleProgram.recursive(second_input, proof);
console.log("Second Proof: ", second_proof);


