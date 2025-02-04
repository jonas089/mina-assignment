import { Field, Poseidon, MerkleTree, ZkProgram, UInt32, Struct, MerkleWitness, Circuit, SelfProof } from 'o1js';


// a simplified mock tree that works with field elements
class CustomTree extends Struct({
    leafs: Array(Field)
}) {
    insert(element: Field) {
        this.leafs.push(element);
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
    methods: {
        prove: {
            privateInputs: [],
            async method(publicInput: CircuitInputs) {
                let input_hash = Poseidon.hash([publicInput.new_input]);
                publicInput.tree.insert(input_hash);
                // commit the current Tree hash
                this.output = publicInput.tree.hash();

            },
        },
        recursive: {
            privateInputs: [SelfProof<Field, void>],
            async method(publicInput: CircuitInputs, previous_proof: SelfProof<Field, void>) {
                previous_proof.verify();
                let input_hash = Poseidon.hash([publicInput.new_input]);
                publicInput.tree.insert(input_hash);
                // commit the next Tree hash
                this.output = publicInput.tree.hash();
            },
        }
    },
});

const { verificationKey } = await SimpleProgram.compile();
// each leaf is an arbitrarily sized leaf's poseidon hash
// therefore a leaf can represent any data.
// initialize with an empty leaf for simplicity sake
let leafs = [Field(0)];
// construct the tree with one leaf in it
let Tree = new CustomTree({ leafs: leafs });
// hash the initial tree root
let initial_root = Tree.hash();
let input = new CircuitInputs({ tree: Tree, root: initial_root, new_input: Field(0) })
// must pass: 
// - the witness for the merkle proof
// - the expected tree root
// - the hash of the inserted state
// - the preimage of the inserted state
const { proof } = await SimpleProgram.prove(input);
console.log("Proof", proof);
// must pass: 
// - the witness for the merkle proof
// - the expected tree root
// - the hash of the inserted state
// - the preimage of the inserted state


