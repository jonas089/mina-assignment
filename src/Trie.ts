import { Field, Poseidon, MerkleTree, Bool, Proof, ZkProgram, UInt32, Struct } from 'o1js';

class Account extends Struct({
    name: UInt32,
}) {
    hash(): Field {
        return Poseidon.hash(Account.toFields(this));
    }
}

const SimpleProgram = ZkProgram({
    name: 'mina-program',
    publicInput: Field,
    methods: {
        run: {
            privateInputs: [],
            async method(publicInput: Field) {
                let Tree = new MerkleTree(8);
                Tree.setLeaf(0n, publicInput);
                // todo: commit the root as a public output
                // todo: generate a proof for the key
            },
        },
    },
});

const { verificationKey } = await SimpleProgram.compile();
let account = new Account({ name: new UInt32(1) });
const { proof } = await SimpleProgram.run(account.hash());
console.log(proof);