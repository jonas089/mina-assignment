import { Field, Poseidon, MerkleTree, ZkProgram, UInt32, Struct, MerkleWitness } from 'o1js';

class TreeMerkleWitness extends MerkleWitness(8) { }

class Node extends Struct({
    index: Field,
    value: Field
}) { }

class PublicNodeInputs extends Struct({
    nodes: [Node],
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
    publicInput: TreeMerkleWitness,
    methods: {
        prove: {
            privateInputs: [Field, MockState, Field, MockState],
            // target: Tree Root after insert, 
            async method(publicInput: TreeMerkleWitness, target: Field, guess: MockState, commitment: Field, nextInsert: MockState
            ) {
                guess.hash().assertEquals(target);
                commitment.assertEquals(commitment);
                publicInput.calculateRoot(guess.hash()).assertEquals(commitment);
                // the new commitment
                let output = publicInput.calculateRoot(nextInsert.hash());
            },
        },
    },
});

const { verificationKey } = await SimpleProgram.compile();
let state = new MockState({ name: new UInt32(1) });
let initial_state_root = state.hash();
// assume here that 1 leaf is already present and we want to re-build the tree & insert a new leaf at index + 1.
// We could maintain the Tree state and pass it to the recursive circuit / inserting the next leaf at each state,
// however I was unable to figure out how to pass the current, already constructed Tree to the circuit as an input.
// publicInput: MerkleTree is not a valid input to the circuit, therefore I have to re-construct the Tree in every iteration.
let Tree = new MerkleTree(8);
Tree.setLeaf(0n, initial_state_root);
let w = Tree.getWitness(0n);
let witness = new TreeMerkleWitness(w);
// assert that it matches the expected root
let previous_root_recomputed = Tree.getRoot();
const { proof } = await SimpleProgram.prove(witness, initial_state_root, state, Tree.getRoot(), state);
console.log(proof);


