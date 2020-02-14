const findeOrCreateChild = (arr, name) => {
  const child = arr.find(child => child.name === name)
  if (!child) {
    const newChild = {}
    newChild.name = name
    arr.push(newChild)
    return newChild
  }
  return child
}
const processFiles = files => {
  const fileChildren = []
  Object.keys(files).forEach(file => {
    const parts = file.split(/\//g).filter(f => {
      return f && !f.match('webpack:')
    })
    let childrenReference = fileChildren
    parts.forEach((part, i, arr) => {
      const child = findeOrCreateChild(childrenReference, part)
      if (i === arr.length - 1) {
        Object.assign(child, files[file])
      } else {
        child.children = child.children || []
        childrenReference = child.children
      }
    })
  })
  return fileChildren
}

const processBundle = bundle => {
  return {
    name: bundle.bundleName.split(/\//g).slice(-1)[0],
    children: processFiles(bundle.files)
  }
}

const calculateAverageCoverage = data => {
  if (data.coveredSize) {
    const averageCoverage = data.coveredSize / data.size
    return averageCoverage
  }
  if (data.children && data.children.length) {
    const averages = data.children.map(child => {
      if (!child.averageCoverage)
        child.averageCoverage = calculateAverageCoverage(child)
      return child.averageCoverage
    })
    let skipCount = 0
    const average =
      averages.reduce((acc, curr) => {
        if (isNaN(curr)) {
          skipCount += 1
          return acc
        }
        return acc + curr
      }, 0) /
      (data.children.length - skipCount)

    data.averageCoverage = average
    return average
  }
}

const addPersistentIds = data => {
  const addId = (id, data) => {
    data.id = id
    if (data.children)
      data.children.forEach(child => {
        addId(`${id}/${child.name}`, child)
      })
  }
  addId(data.name, data)
}

const calculateRealCumulativeSize = data => {
  const processNode = d => {
    if (d.size) {
      d.realSize = d.size
      return d.size
    }
    if (d.children) {
      const cumulativeSize = d.children.map(processNode).reduce((acc, curr) => {
        return acc + curr
      }, 0)
      d.realSize = cumulativeSize
      return cumulativeSize
    }
    return 0
  }
  processNode(data)
  return data
}

const processData = data => {
  const processed = {
    name: 'topLevel',
    children: data.map(processBundle)
  }
  calculateAverageCoverage(processed)
  calculateRealCumulativeSize(processed)
  addPersistentIds(processed)
  return processed
}

module.exports = processData
