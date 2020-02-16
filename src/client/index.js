import 'sanitize.css'
import './index.scss'
import React from 'react'
import ReactDOM from 'react-dom'
import Treemap from './Treemap'
import Breadcrumbs from './Breadcrumbs'
import treeData from './coverage.json'

const findBranch = id => {
  let cachedBranch
  const inner = branch => {
    if (cachedBranch) return
    if (branch.id === id) cachedBranch = branch
    if (branch.children) branch.children.forEach(inner)
  }
  inner(treeData)
  return cachedBranch
}

const Dashboard = () => {
  const [data, _setData] = React.useState(treeData)
  const [hovered, setHovered] = React.useState(null)

  const setData = data => {
    _setData(data)
    setHovered(null)
  }

  const setGraphRoot = id => {
    setData(findBranch(id))
  }

  return (
    <div>
      <Breadcrumbs data={data} setGraphRoot={setGraphRoot} hovered={hovered} />
      <Treemap
        data={data}
        setGraphRoot={setGraphRoot}
        setHovered={setHovered}
      />
    </div>
  )
}

ReactDOM.render(<Dashboard />, document.getElementById('container'))
