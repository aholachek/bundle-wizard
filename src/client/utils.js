import React from 'react'
import levenshtein from 'js-levenshtein'

export function usePrevious(value) {
  const ref = React.useRef()
  React.useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}

export function findMostLikelyPath(arr, name) {
  if (arr.length < 2) return arr[0]

  let leastDistance
  let mostProbablePath
  arr.forEach(pathName => {
    const distance = levenshtein(pathName, name)
    if (leastDistance === undefined || distance < leastDistance) {
      leastDistance = distance
      mostProbablePath = pathName
    }
  })
  return mostProbablePath
}

// any dict with only one key should turn into a key1/key
const hasOneChild = d => d.children && d.children.length === 1

export const collapse = d => {
  if (hasOneChild(d)) {
    const onlyChild = d.children[0]
    const name = `${d.name}/${onlyChild.name}`

    Object.keys(d).forEach(key => delete d[key])
    Object.keys(onlyChild).forEach(key => {
      d[key] = onlyChild[key]
    })

    d.name = name

    collapse(d)
  }
  if (d.children) d.children.forEach(child => collapse(child))
}

export function convertToTree(topLevelData) {
  if (!topLevelData || Object.keys(topLevelData).length === 0) return undefined
  const runtimeData = topLevelData.longTasks.filter(
    t => t[0].kind === 'sourceLocation' && t[0].url
  )

  const timings = runtimeData.reduce((acc, [data, profile]) => {
    const source = data.parsedSourcemap ? data.parsedSourcemap.source : data.url
    acc[source] = acc[source] || []
    acc[source].push([data, profile])
    return acc
  }, {})

  const tree = { name: 'topLevel', children: [], isRuntime: true }

  Object.keys(timings).forEach(timing => {
    // its from a url with no sourcemap
    if (!timings[timing][0][0].parsedSourcemap) {
      return tree.children.push({
        name: timing,
        isRuntime: true,
        details: timings[timing],
        size: timings[timing]
          .map(t => t[1].total)
          .reduce((acc, curr) => {
            return acc + curr
          }, 0)
      })
    }
    const pathParts = timing.split('/').filter(pathPart => {
      return pathPart && pathPart !== 'webpack' && pathPart !== 'webpack:'
    })
    let treeReference = tree
    pathParts.forEach(part => {
      if (!treeReference.children.find(c => c.name === part))
        treeReference.children.push({
          name: part,
          children: []
        })

      treeReference = treeReference.children.find(c => c.name === part)
    })
    const dataEntries = timings[timing]
    treeReference.isRuntime = true

    treeReference.id = pathParts.join('/')

    dataEntries.forEach(entry => {
      treeReference.details = treeReference.details || []
      treeReference.details.push(entry)
      treeReference.size = treeReference.size
        ? treeReference.size + entry[1].total
        : entry[1].total
    })
  })
  console.log(tree)
  return tree
}
