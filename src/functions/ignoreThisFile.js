const fs = require('fs-extra')
const path = require('path')
const sourceMap = require('source-map')

const getFileName = url => (url ? url.split(/\//g).slice(-1)[0] : '')

const longTasksWithStackTraces = longTasks
  .map(t => {
    const children = []
    const processChildren = async c => {
      if (c.event && c.event.args.beginData) {
        children.push(c)
      }
      if (c.children) c.children.forEach(processChildren)
    }

    t.children.forEach(processChildren)

    return { ...t, children }
  })
  .filter(t => t.children.length)

const tasksWithTraces = await Promise.all(
  longTasksWithStackTraces.map(async task => {
    return await Promise.all(
      task.children.map(async child => {
        const trace = child.event.args.beginData.stackTrace[0]

        try {
          const map = fs.readFileSync(
            path.join(
              __dirname,
              '..',
              '..',
              'temp/downloads',
              `${getFileName(trace.url)}.map`
            ),
            'utf8'
          )

          const consumer = await new sourceMap.SourceMapConsumer(
            JSON.parse(map)
          )

          const data = consumer.originalPositionFor({
            line: trace.lineNumber,
            column: trace.columNumber
          })

          return {
            trace: child.event.args.beginData.stackTrace,
            selfTime: child.selfTime,
            duration: child.duration,
            data
          }
        } catch (e) {}
      })
    )
  })
)

//  const beginData = tasks
//     .filter(t => t.event.args.beginData && t.event.args.beginData.stackTrace)
//     .map(t => [t.duration, t.event.args.beginData.stackTrace[0]])

//   const stacks = tasks
//     .filter(t => t.event.args.data && t.event.args.data.columnNumber)
//     .map(t => [t.duration, t.event.args.data])
//     .concat(beginData)
//     .sort((a, b) => b[0] - a[0])

//   const urls = [...new Set(stacks.map(s => s[1].url))]

//   const results = []

//   const promises = urls.map(async url => {
//     try {
//       const map = fs.readFileSync(
//         path.join(
//           __dirname,
//           '..',
//           '..',
//           'temp/downloads',
//           `${getFileName(url)}.map`
//         ),
//         'utf8'
//       )
//       const consumer = await new sourceMap.SourceMapConsumer(JSON.parse(map))
//       consumer.computeColumnSpans()

//       const tracesWithUrl = stacks.filter(([duration, data]) => {
//         return data.url === url
//       })

//       tracesWithUrl.forEach(trace => {
//         const og = consumer.originalPositionFor({
//           line: trace[1].lineNumber,
//           column: trace[1].columnNumber
//         })
//         if (og && og.source !== null) results.push([trace[0], og])
//       })
//       consumer.destroy()
//     } catch (e) {}
//   })

//   await Promise.all(promises)

//   const collated = results.reduce((acc, curr) => {
//     if (!acc[curr[1].source]) acc[curr[1].source] = curr[0]
//     acc[curr[1].source] += curr[0]
//     return acc
//   }, {})

//   fs.writeFileSync(`${__dirname}/test.json`, JSON.stringify(collated))

