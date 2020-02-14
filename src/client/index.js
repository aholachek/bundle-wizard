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
  const [data, setData] = React.useState(treeData)

  const setGraphRoot = id => {
    setData(findBranch(id))
  }

  return (
    <div>
      <Breadcrumbs data={data} setGraphRoot={setGraphRoot} />
      <Treemap data={data} setGraphRoot={setGraphRoot} />
    </div>
  )
}

ReactDOM.render(<Dashboard />, document.getElementById('container'))
