const processTracing = async tracing => {
  const priorities = tracing.traceEvents
    .filter(event => event.args.data && event.args.data.priority)
    .map(event => event.args.data)
  return priorities
}

module.exports = processTracing
