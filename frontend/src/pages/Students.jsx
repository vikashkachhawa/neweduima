import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { schoolService } from '../services';
import { Box, Card, CardContent, Typography, TextField, InputAdornment, CircularProgress, Chip } from '@mui/material';
import { Search, People } from '@mui/icons-material';

const Students = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const data = await schoolService.getSchoolUsers();
        setUsers((data.users || []).filter(u => u.role === 'student'));
      } catch (e) {
        console.error('Failed to load students', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return users;
    return users.filter(u => (
      (u.first_name + ' ' + u.last_name).toLowerCase().includes(qq) ||
      (u.email || '').toLowerCase().includes(qq)
    ));
  }, [users, q]);

  return (
    <Layout>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:3 }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
          <People />
          <Typography variant="h5">Students</Typography>
        </Box>
        <TextField
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search students"
          size="small"
          InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }}
        />
      </Box>
      {loading ? (
        <Box sx={{ display:'flex', justifyContent:'center', py:6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card>
          <CardContent>
            {filtered.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No students found.</Typography>
            ) : filtered.map(u => (
              <Box key={u.id} sx={{ display:'grid', gridTemplateColumns:{ xs:'1fr', sm:'2fr 1fr 1fr' }, gap:2, py:1, borderBottom:'1px solid', borderColor:'divider' }}>
                <Typography variant="body1">{u.first_name} {u.last_name}</Typography>
                <Typography variant="body2" color="text.secondary">{u.email}</Typography>
                <Chip label={u.is_active ? 'Active' : 'Inactive'} color={u.is_active ? 'success' : 'default'} size="small"/>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Layout>
  );
};

export default Students;
