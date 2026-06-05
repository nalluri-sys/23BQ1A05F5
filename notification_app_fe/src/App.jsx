import React, { useEffect, useState, useCallback } from 'react'
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Pagination,
  Box,
  ListItemSecondaryAction,
  Checkbox,
} from '@mui/material'

const API_URL = 'http://4.224.186.213/evaluation-service/notifications'

export default function App() {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [typeFilter, setTypeFilter] = useState('All')
  const [hasNext, setHasNext] = useState(false)
  const [readSet, setReadSet] = useState(new Set())

  const useMock = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mock') === '1'

  const sampleData = [
    { ID: 'm1', Type: 'Placement', Message: 'Mock: Company A hiring', Timestamp: new Date().toISOString().slice(0,19).replace('T',' ') },
    { ID: 'm2', Type: 'Result', Message: 'Mock: Results published', Timestamp: new Date().toISOString().slice(0,19).replace('T',' ') },
    { ID: 'm3', Type: 'Event', Message: 'Mock: Orientation', Timestamp: new Date().toISOString().slice(0,19).replace('T',' ') }
  ]

  const fetchPage = useCallback(() => {
    setLoading(true)
    if (useMock) {
      // Use embedded sample data for testing
      setNotifs(sampleData.slice(0, limit))
      setHasNext(false)
      setLoading(false)
      return
    }

    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('page', String(page))
    if (typeFilter && typeFilter !== 'All') params.set('notification_type', typeFilter)

    fetch(`${API_URL}?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        const items = d.notifications || []
        setNotifs(items)
        // If API returned fewer than limit, assume no next page
        setHasNext(items.length >= limit)
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [page, limit, typeFilter])

  useEffect(() => {
    fetchPage()
  }, [fetchPage])

  function toggleRead(id) {
    setReadSet((prev) => {
      const copy = new Set(prev)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }

  return (
    <Container maxWidth="md" sx={{ paddingTop: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">Notifications</Typography>
        <Button variant="contained" onClick={() => fetchPage()}>Refresh</Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <FormControl size="small">
          <InputLabel id="type-filter-label">Type</InputLabel>
          <Select
            labelId="type-filter-label"
            value={typeFilter}
            label="Type"
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Event">Event</MenuItem>
            <MenuItem value="Result">Result</MenuItem>
            <MenuItem value="Placement">Placement</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel id="limit-label">Per page</InputLabel>
          <Select
            labelId="limit-label"
            value={limit}
            label="Per page"
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          >
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={20}>20</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {loading && <Typography>Loading...</Typography>}

      <List>
        {notifs.map((n) => {
          const isRead = readSet.has(n.ID)
          return (
            <ListItem key={n.ID} divider sx={{ opacity: isRead ? 0.6 : 1.0 }}>
              <ListItemText
                primary={n.Message}
                secondary={n.Timestamp}
                primaryTypographyProps={{ style: { textDecoration: isRead ? 'line-through' : 'none' } }}
              />
              <Chip label={n.Type} sx={{ mr: 1 }} />
              <ListItemSecondaryAction>
                <Checkbox
                  edge="end"
                  onChange={() => toggleRead(n.ID)}
                  checked={isRead}
                  inputProps={{ 'aria-label': 'mark read' }}
                />
              </ListItemSecondaryAction>
            </ListItem>
          )
        })}
      </List>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button variant="outlined" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <Typography>Page {page}</Typography>
          <Button variant="outlined" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </Stack>
      </Box>
    </Container>
  )
}
