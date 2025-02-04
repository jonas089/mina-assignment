import { Field, Poseidon, MerkleTree, ZkProgram, UInt32, Struct } from 'o1js';

class Node extends Struct({
    index: Field,
    value: Field
}) { }

class PublicNodeInputs extends Struct({
    nodes: [Node],
    index: Field,
    leaf: Field,
    previous_root: Field,
}) { }

class Account extends Struct({
    name: UInt32,
}) {
    hash(): Field {
        return Poseidon.hash(Account.toFields(this));
    }
}

const SimpleProgram = ZkProgram({
    name: 'mina-recursive-tree-program',
    publicInput: PublicNodeInputs,
    methods: {
        prove: {
            privateInputs: [],
            async method(publicInput: PublicNodeInputs) {
                let Tree = new MerkleTree(8);
                // fill tree with previous leafs
                for (const leaf of publicInput.nodes) {
                    Tree.setLeaf(leaf.index.toBigInt(), leaf.value);
                }
                // assert that it matches the expected root
                let previous_root_recomputed = Tree.getRoot();
                previous_root_recomputed.assertEquals(publicInput.previous_root);
                // insert the new leaf
                Tree.setLeaf(publicInput.index.toBigInt(), publicInput.leaf);
                let output = Tree.getRoot();
                // insert at index 0
                // todo: commit the root as a public output
                // todo: generate a proof for the key
            },
        },
    },
});

const { verificationKey } = await SimpleProgram.compile();
let account = new Account({ name: new UInt32(1) });
let default_input = account.hash();
let Tree: MerkleTree = new MerkleTree(8);
let nodes = [];
// assume here that 1 leaf is already present and we want to re-build the tree & insert a new leaf at index + 1.
// We could maintain the Tree state and pass it to the recursive circuit / inserting the next leaf at each state,
// however I was unable to figure out how to pass the current, already constructed Tree to the circuit as an input.
// publicInput: MerkleTree is not a valid input to the circuit, therefore I have to re-construct the Tree in every iteration.
let publicInputStruct = new PublicNodeInputs({ nodes: [new Node({ index: Field(0), value: default_input })], index: Field(1), leaf: default_input, previous_root: Field(0/*unknown due to BigInt compiler error?*/) });
const { proof } = await SimpleProgram.prove(publicInputStruct);
console.log(proof);


