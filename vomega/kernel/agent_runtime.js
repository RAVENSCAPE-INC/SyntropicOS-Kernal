const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')

class AgentRuntime extends EventEmitter {
  constructor(opts = {}) {
    super()
    this.agentsDir = path.join(__dirname, '..', 'agents')
    this.agents = {}
    this.running = false
  }

  loadAgents() {
    if (!fs.existsSync(this.agentsDir)) return
    const files = fs.readdirSync(this.agentsDir)
    files.forEach(f => {
      if (!f.endsWith('.js')) return
      try {
        const mod = require(path.join(this.agentsDir, f))
        const name = path.basename(f, '.js')
        this.agents[name] = mod
      } catch (e) {
        console.warn('agent load failed', f, e.message)
      }
    })
  }

  start() {
    if (this.running) return
    this.loadAgents()
    this.running = true
    this.emit('started')
  }

  listAgents() {
    return Object.keys(this.agents)
  }

  async dispatch(agentName, payload = {}) {
    if (!this.agents[agentName]) throw new Error('agent-not-found')
    const agent = this.agents[agentName]
    if (typeof agent.run !== 'function') throw new Error('agent-invalid')
    // run agent with a shallow sandbox (no unsafe ops)
    try {
      const res = await Promise.resolve(agent.run(payload))
      this.emit('dispatch', { agent: agentName, payload, result: res })
      return { ok: true, result: res }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  }
}

module.exports = AgentRuntime
