// Recognize the Solidity IPFS + compiler-version CBOR trailer explicitly.
// Unknown formats remain part of the comparison (fail closed).
function splitRuntimeMetadata(bytecode) {
  const code = bytecode.toLowerCase();
  const match = code.match(/a2646970667358221220[0-9a-f]{64}64736f6c6343[0-9a-f]{6}0033$/);
  return match
    ? { executable: code.slice(0, -match[0].length), metadata: match[0] }
    : { executable: code, metadata: null };
}

function compareRuntimeBytecode(local, deployed) {
  const left = splitRuntimeMetadata(local);
  const right = splitRuntimeMetadata(deployed);
  return {
    executableMatches: left.executable === right.executable,
    metadataMatches: left.metadata === right.metadata,
    fullBytecodeMatches: local.toLowerCase() === deployed.toLowerCase(),
  };
}

module.exports = { compareRuntimeBytecode };
