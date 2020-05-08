const sourceMap = require('source-map')
const fs = require('fs-extra')
const path = require('path')
const {
  summarize
} = require('@sethfowler/chromium-trace-analyzer/dist/analysis/summarize')
const {
  createTaskTrace
} = require('@sethfowler/chromium-trace-analyzer/dist/analysis/createTaskTrace')
const {
  inferAttributions
} = require('@sethfowler/chromium-trace-analyzer/dist/analysis/inferAttributions')
const {
  computeBreakdowns
} = require('@sethfowler/chromium-trace-analyzer/dist/analysis/computeBreakdowns')
const {
  addPlayByPlays
} = require('@sethfowler/chromium-trace-analyzer/dist/analysis/addPlayByPlays')

const getFileName = url => (url ? url.split(/\//g).slice(-1)[0] : '')

const processTracing = async tracing => {
  const allTasks = []
  // get report
  try {
    const sourcemapConsumers = {}

    const preparedTrace = await createTaskTrace(tracing)
    inferAttributions(preparedTrace)
    computeBreakdowns(preparedTrace)
    addPlayByPlays(preparedTrace)
    summary = summarize(preparedTrace, {})

    summary.byTaskDuration
      .forEach(task => {
        task.breakdownsByAttribution.forEach((key, val) => {
          allTasks.push([val, key])
        })
      })

    const promises = allTasks.map(async ([task, breakdown]) => {
      if (!task.kind === 'sourceLocation' || !task.url) return undefined
      try {
        if (task.url && !sourcemapConsumers[task.url]) {
          const map = fs.readFileSync(
            path.join(
              __dirname,
              '..',
              '..',
              'temp/downloads',
              `${getFileName(task.url)}.map`
            ),
            'utf8'
          )
          const consumer = await new sourceMap.SourceMapConsumer(
            JSON.parse(map)
          )
          consumer.computeColumnSpans()
          sourcemapConsumers[task.url] = consumer
        }
        const consumer = sourcemapConsumers[task.url]

        task.parsedSourcemap = consumer.originalPositionFor({
          line: task.lineNumber,
          column: task.columnNumber
        })
      } catch (e) {
        // some will always throw errors, logging them would be noisy
      }
    })

    await Promise.all(promises)
  } catch (e) {
    console.error(e)
  }

  const priorities = tracing.traceEvents
    .filter(event => event.args.data && event.args.data.priority)
    .map(event => event.args.data)
  return { priorities, longTasks: allTasks }
}

module.exports = processTracing
