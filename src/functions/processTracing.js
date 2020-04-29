const tracium = require('tracium')

const longTaskThreshold = 150

const processTracing = async (tracing) => {
  let longTasks = []

  try {
    const tasks = tracium.computeMainThreadTasks(tracing, {
      flatten: true,
    })

    longTasks = tasks
      .filter((t) => t.kind === 'scriptEvaluation')
      .filter((t) => t.duration > longTaskThreshold)
  } catch (e) {
    console.error('\nWarning: could not parse long task report, skipping')
  }

  const priorities = tracing.traceEvents
    .filter((event) => event.args.data && event.args.data.priority)
    .map((event) => event.args.data)
  return { priorities, longTasks }
}

module.exports = processTracing
