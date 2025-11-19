const { execSync } = require('child_process')
try {
  console.log('Running vΩ tests (basic kernel health)')
  const out = execSync('node kernel/index.js & sleep 0.5; curl -s http://127.0.0.1:4010/health', { cwd: __dirname + '/../' })
  console.log('kernel health:', out.toString())
  process.exit(0)
} catch (e) { console.error('tests failed', e); process.exit(2) }
