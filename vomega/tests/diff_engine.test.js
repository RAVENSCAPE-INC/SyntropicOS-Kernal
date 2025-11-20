// vΩ Diff & Patch Engine tests
const { applyEditsToContent, unifiedDiff, computeRisk } = require('../kernel/diff_engine')

function assertEq(a, b, msg) {
  if (a !== b) throw new Error('Assertion failed: ' + (msg || `${a} !== ${b}`))
}

// Test: single line insert
let orig = 'a\nb\nc'
let edits = [{ startLine: 1, endLine: 2, replacement: 'B' }]
let result = applyEditsToContent(orig, edits)
assertEq(result, 'a\nB\nc', 'single line replace')

// Test: multi-span edits (non-overlapping)
orig = 'a\nb\nc\nd\ne'
edits = [
  { startLine: 1, endLine: 2, replacement: 'B' },
  { startLine: 3, endLine: 4, replacement: 'D' }
]
result = applyEditsToContent(orig, edits)
assertEq(result, 'a\nB\nc\nD\ne', 'multi-span replace')

// Test: unifiedDiff
const diff = unifiedDiff('a\nb\nc', 'a\nB\nc')
assertEq(diff.includes('-b'), true, 'diff contains -b')
assertEq(diff.includes('+B'), true, 'diff contains +B')

// Test: computeRisk
const risk = computeRisk('a\nb\nc', 'a\nB\nc')
assertEq(typeof risk.risk, 'number', 'risk is number')
console.log('✓ All diff_engine tests passed.')
