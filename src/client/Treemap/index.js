import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { usePrevious } from '../utils'
import throttle from 'lodash.throttle'
import cloneDeep from 'lodash.clonedeep'

const color = d3.scaleSequential([-0.2, 1.15], d3.interpolateRdYlGn)

const isTopLevel = data => data.name === 'topLevel'

const removeTooSmallNodes = (data, ids) => {
  const idDict = ids.reduce((acc, curr) => {
    acc[curr] = true
    return acc
  }, {})
  const traverseTree = node => {
    if (node.children) {
      const originalChildCount = node.children.length

      const filteredChildren = node.children.filter(child => {
        return idDict[child.id]
      })

      let removedSize = 0

      const traverseSize = node => {
        if (node.size) removedSize += node.size
        else if (node.children) node.children.forEach(traverseSize)
      }

      const removedNodes = node.children.filter(child => !idDict[child.id])
      removedNodes.forEach(traverseSize)

      const additionalFraction = removedSize / filteredChildren.length

      filteredChildren.forEach(node => {
        const leafChildren = []

        const traverse = node => {
          if (!node.children) {
            leafChildren.push(node)
            return
          }
          node.children.forEach(node => {
            if (!node.children || !node.children.length) leafChildren.push(node)
            else traverse(node)
          })
        }
        traverse(node)

        leafChildren.forEach(
          leaf => (leaf.size += additionalFraction / leafChildren.length)
        )
      })

      node.children = filteredChildren
      node.originalChildCount = originalChildCount

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

const renderGraph = ({ el, data, setGraphRoot, width, height, setHovered }) => {
  const container = d3.select(el)

  const isFirstRender = el.childElementCount > 0

  if (!isFirstRender) {
    el.classList.add('box-transition-position')
  }

  const treemap = data => {
    return d3
      .treemap()
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

  const dataCopy = cloneDeep(data)
  const testRoot = treemap(dataCopy)

  const filterData = node => {
    if (!node.children) return
    const parentArea = (node.y1 - node.y0) * (node.x1 - node.x0)
    const maxChildren = Math.ceil(parentArea / 10000)
    node.children = node.children.slice(0, maxChildren)

    node.children.forEach(c => filterData(c))
  }

  filterData(testRoot)
  const allowedIds = testRoot.descendants().map(node => node.data.id)
  collapse(dataCopy)
  const filteredData = removeTooSmallNodes(dataCopy, allowedIds)
  const root = treemap(filteredData)

  const createEnteredElements = enter => {
    const entered = enter
      .filter(function(d) {
        const width = d.x1 - d.x0
        const height = d.y1 - d.y0
        return width > 2 && height > 2 && height * width > 50
      })
      .append('div')
      .style('background-color', d => {
        if (typeof d.data.averageCoverage !== 'number')
          return 'hsla(0, 0%, 0%, .04)'
        if (isTopLevel(d.data)) return 'white'
        return color(d.data.averageCoverage)
      })
      .style('box-shadow', d => {
        if (typeof d.data.averageCoverage !== 'number')
          return '0 0 0 1px hsla(0, 0%, 0%, 0.5)'

        const background = color(d.data.averageCoverage)
        const borderColor = d3.hsl(background).darker(1)
        return `0 0 0 1px ${borderColor}`
      })
      .on('click', d => {
        setGraphRoot(d.data.id)
      })
      .on('mouseenter', d => {
        setHovered(d)
      })
      .on('mouseleave', d => {
        setHovered(null)
      })
      .classed(`box ${isFirstRender ? 'animate-in-box' : ''}`, true)
      .style('z-index', d => {
        return d.depth
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
      .style('transform', d => {
        return `translate(${d.x0}px, ${d.y0}px)`
      })
      .classed('no-interact', d => {
        return !d.parent
      })
      .each(function(d) {
        const width = d.x1 - d.x0
        const height = d.y1 - d.y0
        this.dataset.prevWidth = width
        this.dataset.prevHeight = height
      })

    const label = entered
      .append('div')
      .attr('class', 'label')

      .text(d => {
        if (isTopLevel(d.data)) return 'all bundles'
        return d.data.name
      })

    label.append('div').text(d => `${Math.ceil(d.data.realSize / 1000)}kb`)

    return entered
  }

  const animateUpdate = selection => {
    if (selection.size() === 0) return
    document.body.classList.add('animation-in-progress')

    const startAnimation = () => {
      setTimeout(() => {
        document.body.classList.remove('animation-in-progress')
        // show new containers
        selection.each(function(d) {
          this.style.transition = 'none'
          this.style.transform = `translate(${d.x0}px, ${d.y0}px) scale(1)`
          const width = d.x1 - d.x0
          this.dataset.prevWidth = width
          const height = d.y1 - d.y0
          this.dataset.prevHeight = height
          this.style.width = `${width}px`
          this.style.height = `${height}px`
          requestAnimationFrame(() => {
            this.style.transition = ''
          })
        })
      }, 400)

      selection
        .classed('no-interact', d => {
          return !d.parent
        })
        .style('z-index', d => {
          return d.depth
        })
        .style('transform', function(d) {
          const scaleX = (d.x1 - d.x0) / (this.dataset.prevWidth || 1)
          const scaleY = (d.y1 - d.y0) / (this.dataset.prevHeight || 1)
          return `translate(${d.x0}px, ${d.y0}px) scaleX(${scaleX}) scaleY(${scaleY})`
        })
    }
    startAnimation()
  }

  container
    .selectAll('div.box')
    .data(root.descendants(), d => {
      if (!d) return ''
      return d.data.id
    })
    .join(createEnteredElements, animateUpdate, exit => {
      exit.classed('animate-out-box', true)
      setTimeout(() => {
        exit.remove()
      }, 300)
    })
}

const Treemap = ({ data, setGraphRoot, setHovered }) => {
  const graphContainerRef = React.useRef(null)
  const previousDataId = usePrevious(data.id)
  const dimensionsRef = useRef({})
  const cacheWindowSize = () => {
    dimensionsRef.current.width = window.innerWidth
    dimensionsRef.current.height = document.body.clientHeight - 120
  }
  useEffect(() => {
    const throttledResize = throttle(() => {
      cacheWindowSize()

      renderGraph({
        el: graphContainerRef.current,
        data,
        setGraphRoot,
        setHovered,
        ...dimensionsRef.current
      })
    }, 250)
    window.addEventListener('resize', throttledResize)
    return () => {
      window.removeEventListener('resize', throttledResize)
    }
  }, [])

  useEffect(() => {
    cacheWindowSize()

    if (previousDataId !== data.id) {
      renderGraph({
        el: graphContainerRef.current,
        data,
        setGraphRoot,
        setHovered,
        ...dimensionsRef.current
      })
    }
  }, [data.id])

  return <div ref={graphContainerRef} className="treemap"></div>
}

export default Treemap
