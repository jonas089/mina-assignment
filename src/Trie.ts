import { Field, Poseidon, MerkleTree, ZkProgram, UInt32, Struct, MerkleWitness, Circuit } from 'o1js';

class TreeMerkleWitness extends MerkleWitness(8) { }

class CircuitInputs extends Struct({
    witness: TreeMerkleWitness,
    root: Field
}) { }

class MockState extends Struct({
    name: UInt32,
}) {
    hash(): Field {
        return Poseidon.hash(MockState.toFields(this));
    }
}

const SimpleProgram = ZkProgram({
    name: 'mina-recursive-tree-program',
    publicInput: CircuitInputs,
    methods: {
        prove: {
            privateInputs: [Field, MockState],
            async method(publicInput: CircuitInputs, target: Field, guess: MockState
            ) {
                // verify the hash of the leaf
                guess.hash().assertEquals(target);
                // verify the merkle proof against the expected root - proves that the leaf was previously inserted
                // in the tree / that it exists in the tree
                publicInput.witness.calculateRoot(guess.hash()).assertEquals(publicInput.root);
            },
        },
    },
});

const { verificationKey } = await SimpleProgram.compile();
let state = new MockState({ name: new UInt32(1) });
let initial_state_root = state.hash();
let Tree = new MerkleTree(8);
Tree.setLeaf(0n, initial_state_root);
let w = Tree.getWitness(0n);
let witness = new TreeMerkleWitness(w);
let input = new CircuitInputs({ witness: witness, root: Tree.getRoot() })
// must pass: 
// - the witness for the merkle proof
// - the expected tree root
// - the hash of the inserted state
// - the preimage of the inserted state
const { proof } = await SimpleProgram.prove(input, initial_state_root, state);
console.log(proof);


