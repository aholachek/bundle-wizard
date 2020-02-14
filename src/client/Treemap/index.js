import React, { useEffect } from 'react'
import * as d3 from 'd3'
import { usePrevious } from '../utils'
import throttle from 'lodash.throttle'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'

const color = d3.scaleSequential([-0.15, 1.1], d3.interpolateRdYlGn)

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

// any dict with only one key should turn into a key1/key
const hasOneChild = d => d.children && d.children.length === 1

const collapse = d => {
  if (hasOneChild(d)) {
    const onlyChild = d.children[0]
    // only show first and last folder
    d.name = `${d.name.split('/')[0]}/${onlyChild.name}`
    const keys = ['children', 'size', 'coveredSize']
    keys.forEach(key => {
      d[key] = onlyChild[key]
    })
    collapse(d)
  } else if (d.children) d.children.forEach(child => collapse(child))
}

const renderGraph = ({ el, data, tippyInstances, setGraphRoot }) => {
  const width = document.body.clientWidth - 64
  const height = document.body.clientHeight - 64

  const container = d3.select(el)

  el.classList.add('hide-labels')

  const isNotFirstRender = el.childElementCount > 0

  if (isNotFirstRender) el.classList.add('box-transition-position')

  setTimeout(() => {
    el.classList.remove('hide-labels')
  }, 400)

  const treemap = data => {
    return d3
      .treemap()
      .tile(d3.treemapBinary)
      .size([width, height])
      .paddingOuter(10)
      .paddingTop(24)
      .paddingInner(4)
      .round(false)(
      d3
        .hierarchy(data)
        .sum(d => d.size)
        .sort((a, b) => b.value - a.value)
    )
  }

  const dataCopy = JSON.parse(JSON.stringify(data))
  const testRoot = treemap(dataCopy)

  const tooSmallNodeIds = testRoot
    .descendants()
    .filter(node => {
      return calculateArea(node) < 500
    })
    .map(node => node.data.id)

  const filteredData = removeTooSmallNodes(dataCopy, tooSmallNodeIds)
  collapse(filteredData)
  const root = treemap(filteredData)

  const animDuration = 500

  const position = selection => {
    selection.style('z-index', d => {
      return d.depth
    })

    if (isNotFirstRender) {
      el.classList.add('animation-in-progress')
      selection
        .style('width', d => {
          const width = d.x1 - d.x0
          d.prevWidth = width
          return `${width}px`
        })
        .style('height', d => {
          const height = d.y1 - d.y0
          d.prevHeight = height
          return `${height}px`
        })
        .style('transform', d => {
          console.log(d.prevWidth)
          const scaleX = (d.x1 - d.x0) / (d.prevWidth || 100)
          const scaleY = (d.y1 - d.y0) / (d.prevHeight || 100)

          console.log(
            `translate(${d.x0}px, ${d.y0}px) scale(${scaleX}, ${scaleY})`
          )
          return `translate(${d.x0}px, ${d.y0}px) scale(${scaleX}, ${scaleY})`
        })
        .style('z-index', d => {
          return d.depth
        })

      setTimeout(() => {
        el.classList.remove('animation-in-progress')
        selection
          .style('transition', '')
          .style('transform', d => {
            return `translate(${d.x0}px, ${d.y0}px) scale(1)`
          })
          .style('width', d => {
            const width = d.x1 - d.x0
            d.prevWidth = width
            return `${width}px`
          })
          .style('height', d => {
            const height = d.y1 - d.y0
            d.prevHeight = height
            return `${height}px`
          })
      }, animDuration)
    } else {
      selection
        .style('transform', d => {
          return `translate(${d.x0}px, ${d.y0}px) scale(1)`
        })
        .style('width', d => {
          const width = d.x1 - d.x0
          d.prevWidth = width
          return `${width}px`
        })
        .style('height', d => {
          const height = d.y1 - d.y0
          d.prevHeight = height
          return `${height}px`
        })
    }
  }

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
        // return 'white'
        return color(d.data.averageCoverage) || 'white'
      })
      .on('click', d => {
        setGraphRoot(d.data.id)
      })
      .each(function(d) {
        this.classList.add('box')
        this.dataset.tippyContent = `
          <div class="tooltip-name">${d.data.name}</div>
          <div><b>Size:</b>&nbsp;${Math.ceil(d.data.realSize / 1000)}kb</div>
          <div><b>Coverage:</b>&nbsp;${Math.floor(
            d.data.averageCoverage * 100
          )}%</div>
        `
        if (!isTopLevel(d.data) && !isTopLevel(data))
          this.classList.add('animate-in-box')
      })

    entered.append('div').attr('class', 'label')
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
      const isLeaf = Boolean(d.data.coveredSize)
      const label = `
      <div>${
        isLeaf ? d.data.name.split('/').join('/<br/>') : d.data.name
      }</div> <div>${Math.ceil(d.data.realSize / 1000)}kb</div>
     `
      this.querySelector('.label').innerHTML = label
    })

  tippyInstances.map(i => i.destroy())
  return tippy('.box', {
    allowHTML: true,
    distance: 10
  })
}

const Treemap = ({ data, setGraphRoot }) => {
  const graphContainerRef = React.useRef(null)
  const previousDataId = usePrevious(data.id)
  const tippyInstanceRef = React.useRef([])
  useEffect(() => {
    const throttledResize = throttle(() => {
      renderGraph({
        el: graphContainerRef.current,
        data,
        tippyInstances: tippyInstanceRef.current,
        setGraphRoot
      })
    }, 250)
    window.addEventListener('resize', throttledResize)
    return () => {
      window.removeEventListener('resize', throttledResize)
    }
  }, [])

  useEffect(() => {
    if (previousDataId !== data.id) {
      tippyInstanceRef.current = renderGraph({
        el: graphContainerRef.current,
        data,
        tippyInstances: tippyInstanceRef.current,
        setGraphRoot
      })
    }
  }, [data.id])

  return <div ref={graphContainerRef} className="treemap"></div>
}

export default Treemap
