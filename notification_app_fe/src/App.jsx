import React, { useEffect, useState } from 'react'
import { Container, Typography, List, ListItem, ListItemText, Chip, Stack, Button } from '@mui/material'

const API_URL = 'http://4.224.186.213/evaluation-service/notifications'

export default function App() {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(API_URL)
      .then((r) => r.json())
      .then((d) => setNotifs(d.notifications || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container maxWidth="md" sx={{ paddingTop: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">Notifications</Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>Refresh</Button>
      </Stack>

      {loading && <Typography>Loading...</Typography>}

      <List>
        {notifs.map((n) => (
          <ListItem key={n.ID} divider>
            <ListItemText primary={n.Message} secondary={n.Timestamp} />
            <Chip label={n.Type} />
          </ListItem>
        ))}
      </List>
    </Container>
  )
}
