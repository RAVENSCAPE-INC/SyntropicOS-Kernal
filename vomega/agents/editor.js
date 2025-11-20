// Simple editor agent stub: applies a transformation suggestion to edits
module.exports.run = function run(payload) {
  const edits = payload.edits || []
  // echo back edits with a note
  const transformed = edits.map((e, i) => Object.assign({}, e, { note: `editor-note-${i}` }))
  return { ok: true, edits: transformed }
}
