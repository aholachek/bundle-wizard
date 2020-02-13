import 'sanitize.css'
import './index.scss'
import _sourcemapAnalysis from './sourcemap-analysis.json'
import * as d3 from 'd3'
import { Flipper } from 'flip-toolkit'

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

  // any dict with only one key should turn into a key1/key2

  const hasOneChild = d => {
    return d.children && d.children.length === 1
  }

  const collapse = d => {
    if (hasOneChild(d)) {
      const onlyChild = d.children[0]
      d.name = `${d.name}/${onlyChild.name}`
      const keys = ['children', 'size', 'coveredSize']
      keys.forEach(key => {
        d[key] = onlyChild[key]
      })
      collapse(d)
    } else if (d.children) d.children.forEach(child => collapse(child))
  }
  fileChildren.forEach(child => collapse(child))
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
  const processed = { name: 'topLevel', children: data.map(processBundle) }
  calculateAverageCoverage(processed)
  calculateRealCumulativeSize(processed)
  addPersistentIds(processed)
  return processed
}

const sourcemapAnalysis = processData(_sourcemapAnalysis.results)

const state = {
  data: sourcemapAnalysis
}

const findBranch = id => {
  let cachedBranch
  const inner = branch => {
    if (cachedBranch) return
    if (branch.id === id) cachedBranch = branch
    if (branch.children) branch.children.forEach(inner)
  }
  inner(sourcemapAnalysis)
  return cachedBranch
}

const width = document.body.clientWidth - 64
const height = document.body.clientHeight - 64

const color = d3.scaleSequential([-0.1, 1.1], d3.interpolateRdYlGn)

const treemap = data => {
  return d3
    .treemap()
    .tile(d3.treemapBinary)
    .size([width, height])
    .paddingOuter(10)
    .paddingTop(22)
    .paddingInner(4)
    .round(false)(
    d3
      .hierarchy(data)
      .sum(d => d.size)
      .sort((a, b) => b.value - a.value)
  )
}

const container = d3.select('#container')

const flipper = new Flipper({ element: document.querySelector('#container') })

const isTopLevel = data => data.name === 'topLevel'

const calculateArea = node => (node.y1 - node.y0) * (node.x1 - node.x0)

// TODO:
// 1. add "real" size
// 2. take removed size and add evenly to remaining items
const removeTooSmallNodes = (data, ids) => {
  const idDict = ids.reduce((acc, curr) => {
    acc[curr] = true
    return acc
  }, {})
  const traverseTree = node => {
    if (node.children) {
      const filteredChildren = node.children.filter(child => {
        return !idDict[child.id]
      })
      const removedSize = node.children
        .filter(child => {
          return idDict[child.id]
        })
        .map(child => child.size)
        .filter(Boolean)
        .reduce((acc, curr) => acc + curr, 0)

      const allLeafNodes = []

      const findLeafNodes = arr => {
        arr.forEach(child => {
          if (child.size) allLeafNodes.push(child)
          else if (child.children) findLeafNodes(child.children)
        })
      }

      findLeafNodes(filteredChildren)

      const additionalFraction = removedSize / allLeafNodes.length
      allLeafNodes.forEach(node => (node.size += additionalFraction))

      node.children = filteredChildren

      node.children.forEach(traverseTree)
    }
  }
  traverseTree(data)
  return data
}

const renderGraph = ({ data }) => {
  const dataCopy = JSON.parse(JSON.stringify(data))
  const testRoot = treemap(dataCopy)

  const tooSmallNodeIds = testRoot
    .descendants()
    .filter(node => {
      return calculateArea(node) < 500
    })
    .map(node => node.data.id)

  const filteredData = removeTooSmallNodes(dataCopy, tooSmallNodeIds)
  const root = treemap(JSON.parse(JSON.stringify(filteredData)))
  debugger // eslint-disable-line

  const position = selection =>
    selection
      .style('left', d => `${d.x0}px`)
      .style('top', d => `${d.y0}px`)
      .style('width', d => d.x1 - d.x0)
      .style('height', d => d.y1 - d.y0)
      .style('z-index', d => {
        return d.depth
      })

  const createEnteredElements = enter => {
    const entered = enter
      .filter(d => !isTopLevel(d.data))
      // dont show rects with height = 1 or width = 1
      .filter(d => {
        const width = d.x1 - d.x0
        const height = d.y1 - d.y0
        return width > 3 && height > 3
      })
      // // dont show detail inside top level node_modules
      // .filter(d => {
      //   return isTopLevel(state.data) ? parentIsNodeModules(d) < 2 : true
      // })
      .append('div')
      .style('background-color', d => {
        return color(d.data.averageCoverage) || 'white'
      })

      .on('click', d => {
        state.data = findBranch(d.data.id)
        flipper.recordBeforeUpdate()
        renderGraph(state)
        flipper.update()
      })
      .each(function(d) {
        this.classList.add('box')
        if (!isTopLevel(d.data) && !isTopLevel(data))
          this.classList.add('animate-in-box')
      })
      .each(function(d) {
        flipper.addFlipped({
          element: this,
          flipId: d.data.id
        })
      })

    entered.append('div').attr('class', 'label')

    entered.attr('title', d => {
      return `${d
        .ancestors()
        .reverse()
        .map(d => d.data.name)
        .slice(1)
        .join('/')}`
    })
    return position(entered)
  }

  container
    .selectAll('div.box')
    .data(root.descendants(), d => {
      if (!d) return ''
      return d.data.id
    })
    .join(createEnteredElements, update => {
      position(update)
      return update
    })
    .each(function(d) {
      const label = `
      <div>${d.data.name}</div> <div>${Math.ceil(
        d.data.realSize / 1000
      )}kb</div>
     `

      this.querySelector('.label').innerHTML = label
    })
}

renderGraph(state)

// window.addEventListener('resize', event => {
//   renderGraph(state)
// })
