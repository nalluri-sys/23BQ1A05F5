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
  const [showPriority, setShowPriority] = useState(false)
  const [priorityLimit, setPriorityLimit] = useState(5)

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
    // load persisted read state
    try {
      const raw = localStorage.getItem('readNotifications')
      if (raw) {
        const arr = JSON.parse(raw)
        setReadSet(new Set(arr))
      }
    } catch (e) { /* ignore */ }
    fetchPage()
  }, [fetchPage])

  function toggleRead(id) {
    setReadSet((prev) => {
      const copy = new Set(prev)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      // persist
      try { localStorage.setItem('readNotifications', JSON.stringify(Array.from(copy))) } catch (e) {}
      return copy
    })
  }

  // compute priority top-N from currently fetched notifications (or mock data)
  function computePriority(items) {
    const weights = { Placement: 3.0, Result: 2.0, Event: 1.0 }
    const now = new Date()
    function parseTs(s) {
      try {
        // try YYYY-MM-DD HH:MM:SS
        return new Date(s.replace(' ', 'T') + 'Z')
      } catch (e) { return now }
    }
    return items
      .map((it) => {
        const wt = weights[it.Type] || 1.0
        const ts = it.Timestamp ? parseTs(it.Timestamp) : now
        const ageHours = Math.max(0, (now - ts) / 3600000)
        const recency = 1 + 1 / (1 + ageHours)
        return { score: wt * recency, item: it }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, priorityLimit)
      .map((s) => s.item)
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

          <FormControl size="small">
            <InputLabel id="priority-limit-label">Priority N</InputLabel>
            <Select
              labelId="priority-limit-label"
              value={priorityLimit}
              label="Priority N"
              onChange={(e) => setPriorityLimit(Number(e.target.value))}
            >
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
            </Select>
          </FormControl>

          <Button variant={showPriority ? 'contained' : 'outlined'} onClick={() => setShowPriority((s) => !s)}>
            {showPriority ? 'Show All' : 'Show Priority'}
          </Button>
      </Stack>

      {loading && <Typography>Loading...</Typography>}

      <List>
        {(showPriority ? computePriority(notifs) : notifs).map((n) => {
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
