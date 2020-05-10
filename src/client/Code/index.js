import React from 'react'
import styled, { keyframes, css } from 'styled-components'
import Highlight, { defaultProps } from 'prism-react-renderer'
import theme from 'prism-react-renderer/themes/palenight'
import { Flipped } from 'react-flip-toolkit'

const fadeIn = keyframes`
  from {
    opacity: 0
  }
  to {
    opacity: 1;
  }
`

const fontFamily = `font-family: 'Source Code Pro', 'SFMono-Regular', Consolas, 'Liberation Mono',
    Menlo, Courier, monospace;`

const Container = styled.div`
  top: 5.75rem;
  animation: ${fadeIn} 1s forwards;
  position: absolute;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: 100;
  overflow: auto;
  height: 100vh;
  background: rgb(41, 45, 62);
  color: white;
  padding: 2rem;
  padding-top: 1rem;
  ${fontFamily};
  pre,
  code {
    ${fontFamily}
  }
`
const threshold = 70000

export default function Code({ text, setHovered, id }) {
  React.useEffect(() => {
    setHovered(null)
    setTimeout(() => {
      setHovered(null)
    }, 10)
  }, [text, setHovered])
  if (!text) return null
  if (text.length > threshold) {
    return (
      <Container>
        <div>{text}</div>
      </Container>
    )
  }

  return (
    <Flipped flipId={id}>
      <Container>
        <Highlight {...defaultProps} code={text} language="jsx" theme={theme}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={className} style={style}>
              {tokens.map((line, i) => (
                <div {...getLineProps({ line, key: i })} key={i}>
                  {line.map((token, key) => (
                    <span {...getTokenProps({ token, key })} key={key} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </Container>
    </Flipped>
  )
}
