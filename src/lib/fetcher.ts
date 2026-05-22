export const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    // @ts-expect-error - augmenting Error with response payload
    error.info = await res.json()
    // @ts-expect-error - augmenting Error with status code
    error.status = res.status
    throw error
  }
  return res.json()
}
