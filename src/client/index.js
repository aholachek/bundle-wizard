import 'sanitize.css'
import './index.scss'
import _sourcemapAnalysis from './sourcemap-analysis.json'
import * as d3 from 'd3'

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
    .paddingInner(5)
    .round(false)(
    d3
      .hierarchy(data)
      .sum(d => d.size)
      .sort((a, b) => b.value - a.value)
  )
}

const container = d3.select('#graph-container')

const isTopLevel = data => data.name === 'topLevel'

const calculateArea = node => (node.y1 - node.y0) * (node.x1 - node.x0)

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

const updateGraph = id => {
  state.data = findBranch(id)
  renderGraph(state)
}

const renderBreadCrumbs = ({ data }) => {
  const breadcrumbContainer = document.querySelector('#breadcrumb-container')
  const sections = data.id.split('/')

  if (sections.length < 2) return (breadcrumbContainer.innerHTML = '')
  const breadcrumbs = sections.map((section, i, arr) => {
    const text = section === 'topLevel' ? 'all bundles' : section
    return `<li><a href='#' data-value=${arr
      .slice(0, i + 1)
      .join('/')}>${text}</a></li>`
  })
  breadcrumbContainer.addEventListener('click', e => {
    updateGraph(e.target.dataset.value)
  })
  breadcrumbContainer.innerHTML = `<ul>${breadcrumbs.join(
    '&nbsp;/&nbsp;'
  )}</ul>`
}

const renderGraph = ({ data }) => {
  const dataCopy = JSON.parse(JSON.stringify(data))
  const testRoot = treemap(dataCopy)

  const tooSmallNodeIds = testRoot
    .descendants()
    .filter(node => {
      return calculateArea(node) < 750
    })
    .map(node => node.data.id)

  const filteredData = removeTooSmallNodes(dataCopy, tooSmallNodeIds)
  const root = treemap(JSON.parse(JSON.stringify(filteredData)))

  const position = selection =>
    selection
      .style('transform', d => `translate(${d.x0}px, ${d.y0}px )`)
      // .style('top', d => `${d.y0}px`)
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
      .append('div')
      .style('background-color', d => {
        return color(d.data.averageCoverage) || 'white'
      })
      .on('click', d => {
        updateGraph(d.data.id)
      })
      .each(function(d) {
        this.classList.add('box')
        if (!isTopLevel(d.data) && !isTopLevel(data))
          this.classList.add('animate-in-box')
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
    .join(
      createEnteredElements,
      update => {
        position(update)
        return update
      },
      exit => {
        exit.each(function(d) {
          this.classList.add('animate-out-box')
        })
        setTimeout(() => {
          exit.remove()
        }, 250)
      }
    )
    .each(function(d) {
      const label = `
      <div>${d.data.name}</div> <div>${Math.ceil(
        d.data.realSize / 1000
      )}kb</div>
     `
      this.querySelector('.label').innerHTML = label
    })

  renderBreadCrumbs(state)
}

renderGraph(state)

// window.addEventListener('resize', event => {
//   renderGraph(state)
// })
