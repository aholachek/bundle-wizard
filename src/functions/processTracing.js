const tracium = require('tracium')

const processTracing = async tracing => {
  const tasks = tracium.computeMainThreadTasks(tracing, {
    flatten: true
  })

  const longTasks = tasks
    .filter(t => t.kind === 'scriptEvaluation')
    .filter(t => t.duration > 60)

  const priorities = tracing.traceEvents
    .filter(event => event.args.data && event.args.data.priority)
    .map(event => event.args.data)
  return { priorities, longTasks }
}

module.exports = processTracing
