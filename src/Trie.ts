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
            privateInputs: [Field, Field, MockState],
            async method(publicInput: TreeMerkleWitness, treeRoot: Field, target: Field, guess: MockState
            ) {
                guess.hash().assertEquals(target);
                publicInput.calculateRoot(guess.hash()).assertEquals(treeRoot);
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
// must pass: 
// - the witness for the merkle proof
// - the expected tree root
// - the hash of the inserted state
// - the preimage of the inserted state
const { proof } = await SimpleProgram.prove(witness, Tree.getRoot(), initial_state_root, state);
console.log(proof);


