import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';

// SSR exercises the actual React tree, so undefined icons and render failures surface.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { lessons, milestones } = await server.ssrLoadModule('/src/features/academy/course.ts');
  assert.equal(lessons.length, 9);
  assert.equal(milestones.length, 10);
  for (const lesson of lessons) {
    assert.ok(lesson.sections.length >= 3);
    assert.ok(lesson.sections.every(([title, body]) => title.length > 0 && body.length > 80));
    assert.ok(Number.isInteger(lesson.answer) && lesson.answer >= 0 && lesson.answer < lesson.choices.length);
    assert.ok(lesson.task && lesson.deliverable && lesson.why);
    assert.equal(new URL(lesson.link).protocol, 'https:');
  }
  const { Academy } = await server.ssrLoadModule('/src/features/academy/Academy.tsx');
  const html = renderToString(React.createElement(Academy));
  assert.ok(html.includes('블록체인, 직접 만들며 이해하기.'));
  assert.ok(html.includes('답 확인하기'));
  assert.ok(html.includes('내 언어로 설명하기'));
  const guide = await readFile('public/learning/실전가이드.md', 'utf8');
  const contract = await readFile('public/learning/CredentialRegistry.sol', 'utf8');
  assert.ok(guide.includes('Remix VM') && guide.includes('waitForTransactionReceipt'));
  assert.ok(contract.includes('contract CredentialRegistry'));
  console.log('PASS: 9 lesson schemas, quiz keys, full initial React render, downloadable learning artifacts.');
} finally {
  await server.close();
}
