const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compareRuntimeBytecode } = require('./runtime-bytecode');
const trailer = hash => `a2646970667358221220${hash.repeat(64)}64736f6c63430008180033`;

test('distinguishes metadata-only changes from executable changes', () => {
  assert.deepEqual(compareRuntimeBytecode('0x6000' + trailer('a'), '0x6000' + trailer('b')), {
    executableMatches: true, metadataMatches: false, fullBytecodeMatches: false,
  });
  assert.equal(compareRuntimeBytecode('0x6000' + trailer('a'), '0x6001' + trailer('a')).executableMatches, false);
});
test('does not discard unknown or malformed trailers, or empty deployed code', () => {
  assert.equal(compareRuntimeBytecode('0x6000ffff0002', '0x6000aaaa0002').executableMatches, false);
  assert.equal(compareRuntimeBytecode('0x6000' + trailer('a'), '0x6000' + trailer('a').slice(0, -2) + '32').executableMatches, false);
  assert.equal(compareRuntimeBytecode('0x6000' + trailer('a'), '0x').executableMatches, false);
});
