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
