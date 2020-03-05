const Tracium = require('tracium')
const sourceMap = require('source-map')
const fs = require('fs')

const processTracing = async (tracing, downloadsDir) => {
  const tasks = Tracium.computeMainThreadTasks(tracing, {
    flatten: true
  })
  const parseTasks = tasks.filter(t => t.kind === 'scriptParseCompile')

  // const scriptEvalTasks = tasks.filter(
  //   t => t.kind === 'scriptEvaluation' && t.attributableURLs.length
  // )

  // const sourceMapConsumers = {}

  // const processTask = async task => {
  //   try {
  //     const url = task.event.args.data.url
  //     if (!sourceMapConsumers[url]) {
  //       const fileName = new URL(url).pathname.split('/').slice(-1)[0]

  //       if (!fileName) {
  //         return false
  //       }
  //       const sourcemapFile = fs.readFileSync(
  //         `${downloadsDir}/${fileName}.map`,
  //         'utf8'
  //       )
  //       sourceMapConsumers[url] = await new sourceMap.SourceMapConsumer(
  //         JSON.parse(sourcemapFile)
  //       )
  //     }
  //     const sourceMapConsumer = sourceMapConsumers[url]

  //     const data = task.event.args.data

  //     if (data.stackTrace && data.stackTrace.length) {
  //     }

  //     const traceData =
  //       typeof data.lineNumber === 'number'
  //         ? {
  //             line: data.lineNumber,
  //             column: data.columnNumber
  //           }
  //         : null
  //     if (!traceData) {
  //       console.count('no trace data')
  //       return false
  //     }

  //     const ogPosition = sourceMapConsumer.originalPositionFor(traceData) || {}
  //     // if (!ogPosition.source) {
  //     //   console.count('no ogPosition.source')
  //     //   return false
  //     // }
  //     return {
  //       ...ogPosition,
  //       duration: task.duration,
  //       task
  //     }
  //   } catch (e) {
  //     console.count(e)
  //   }
  // }

  // const flatDurations = []

  // let counter = 0
  // const segment = 10
  // while (counter < scriptEvalTasks.length) {
  //   const durationPromises = scriptEvalTasks
  //     .slice(counter, counter + segment)
  //     .map(processTask)
  //   const durationsWithFalseys = await Promise.all(durationPromises)
  //   const durations = durationsWithFalseys.filter(Boolean)
  //   ;[].push.apply(flatDurations, durations)
  //   counter += segment
  // }

  // const aggregated = {}
  // flatDurations.forEach(t => {
  //   const url = t.task.attributableURLs[0]
  //   const source = t.source
  //   if (!aggregated[url]) aggregated[url] = {}
  //   if (!aggregated[url][source]) aggregated[url][source] = {
  //     tasks: [t.]
  //   }
  //   aggregated[url][source] += t.task.selfTime
  // })

  // const histogram = flatDurations.reduce((acc, curr) => {
  //   acc[curr.source] = acc[curr.source] ? acc[curr.source].concat(curr) : [curr]
  //   return acc
  // }, {})
  // Object.keys(histogram).forEach(key => {
  //   histogram[key] = histogram[key].reduce((acc, curr) => {
  //     return acc + curr.task.selfTime
  //   }, 0)
  // })

  // debugger
}

module.exports = processTracing
