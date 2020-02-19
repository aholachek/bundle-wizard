import React from 'react'

const Summary = ({ data }) => {
  const totalSize = data.children
    .map(c => Math.ceil(c.realSize / 1000))
    .reduce((acc, curr) => acc + curr, 0)

  const hasCoverage = data.children.filter(
    c => typeof c.averageCoverage === 'number'
  )
  const averageCoverage = Math.floor(
    (hasCoverage
      .map(c => c.averageCoverage)
      .reduce((acc, curr) => acc + curr, 0) /
      hasCoverage.length) *
      100
  )

  return (
    <div className="summary">
      <div>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Bundle name</th>
              <th>Minified size</th>
              <th>Coverage</th>
            </tr>
          </thead>
          <tbody>
            {data.children
              .sort((a, b) => {
                return b.realSize - a.realSize
              })
              .map((node, i) => {
                return (
                  <tr>
                    <td>{i + 1}</td>
                    <td>{node.name}</td>
                    <td>{Math.ceil(node.realSize / 1000)} kb</td>
                    <td>{Math.floor(node.averageCoverage * 100)}%</td>
                  </tr>
                )
              })}
          </tbody>
          <tfoot>
            <tr>
              <td></td>
              <td>All bundles</td>
              <td>{totalSize} kb</td>
              <td>{averageCoverage}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <h2>Analyzed page:</h2>
      <img
        className="screenshot"
        src="./screenshot.png"
        alt="screenshot of website"
      />
    </div>
  )
}

Summary.propTypes = {}

export default Summary
