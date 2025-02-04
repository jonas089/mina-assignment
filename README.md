# Recursive Merkle Tree Circuit in O1JS
This repo contains an implementation of a SNARK circuit written in O1JS that verifies Merkle Tree inserts recursively.
For each insert a proof is generated that verifies the validity of the leaf and merkle proof against the root and 
the preimage of the leaf.

## Inputs
- the witness for the merkle proof
- the expected tree root 
- the hash of the inserted state
- the preimage of the inserted state

## Outputs
None, but the root is a public input so if the proof verifies this can be treated as the public output.
STARK provers usually don't differentiate between public inputs and outputs.