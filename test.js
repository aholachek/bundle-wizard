const wrappedUseFetch = (...args) => {

  const headers = {
    ...(args.headers || {}),
    mycustomHeader: 'foo'
  }
  
  const vals = useFetch({
    ...args,
    headers
  })

  const errorStatus = vals.error ? vals.error.status : undefined

  useEffect(() => {
    if (error.status === 400) {
      // handle  error here
    }
  }, [errorStatus])

  return vals
}
