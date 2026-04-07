import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { schoolTemplateService } from '../services';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Tab, Tabs, Typography } from '@mui/material';

import Grid from '@mui/material/GridLegacy';
import {
  ContentCopy as ContentCopyIcon,
  LibraryBooks as LibraryBooksIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const CopyButton = ({ payload }) => {
  const handleCopy = async () => {
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard');
    } catch (e) {
      console.error('Copy failed', e);
      alert('Copy failed');
    }
  };

  return (
    <Button size="small" startIcon={<ContentCopyIcon />} onClick={handleCopy}>
      Copy JSON
    </Button>
  );
};

const SectionCard = ({ title, count, children, onRefresh }) => (
  <Card sx={{ mb: 3 }}>
    <CardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6">{title}</Typography>
          <Chip label={count} color="primary" size="small" />
        </Stack>
        {onRefresh && (
          <Button size="small" startIcon={<RefreshIcon />} onClick={onRefresh}>
            Refresh
          </Button>
        )}
      </Stack>
      {children}
    </CardContent>
  </Card>
);

const SchoolTemplateLibrary = () => {
  const [tab, setTab] = useState(0);
  const [streams, setStreams] = useState([]);
  const [examPatterns, setExamPatterns] = useState([]);
  const [holidayPresets, setHolidayPresets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, e, h] = await Promise.all([
        schoolTemplateService.listStreams(),
        schoolTemplateService.listExamPatterns(),
        schoolTemplateService.listHolidayPresets()
      ]);
      setStreams(s.templates || []);
      setExamPatterns(e.templates || []);
      setHolidayPresets(h.presets || []);
    } catch (err) {
      console.error('Failed to load templates', err);
      setError('Unable to load templates right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderStreams = () => (
    <SectionCard title="Stream Templates" count={streams.length} onRefresh={loadData}>
      <Grid container spacing={2}>
        {streams.map((t) => (
          <Grid item xs={12} md={6} key={t.id}>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, height: '100%' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t.name}</Typography>
                  {t.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {t.description}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                    {t.stream_key && <Chip label={`Key: ${t.stream_key}`} size="small" />}
                    {Array.isArray(t.subjects) && t.subjects.map((s, idx) => (
                      <Chip key={`${t.id}-${idx}`} label={s} size="small" color="info" />
                    ))}
                  </Stack>
                </Box>
                <CopyButton payload={t} />
              </Stack>
            </Box>
          </Grid>
        ))}
        {streams.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">No stream templates available.</Typography>
          </Grid>
        )}
      </Grid>
    </SectionCard>
  );

  const renderExamPatterns = () => (
    <SectionCard title="Exam Patterns" count={examPatterns.length} onRefresh={loadData}>
      <Stack spacing={2}>
        {examPatterns.map((t) => (
          <Box key={t.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t.name}</Typography>
                {t.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t.description}
                  </Typography>
                )}
                <Box sx={{ bgcolor: 'background.default', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">Pattern</Typography>
                  <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(t.pattern || {}, null, 2)}
                  </pre>
                </Box>
              </Box>
              <CopyButton payload={t} />
            </Stack>
          </Box>
        ))}
        {examPatterns.length === 0 && (
          <Typography variant="body2" color="text.secondary">No exam pattern templates available.</Typography>
        )}
      </Stack>
    </SectionCard>
  );

  const renderHolidays = () => (
    <SectionCard title="Holiday Presets" count={holidayPresets.length} onRefresh={loadData}>
      <Stack spacing={2}>
        {holidayPresets.map((t) => (
          <Box key={t.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t.name}</Typography>
                <Stack direction="row" spacing={1} sx={{ my: 1 }}>
                  {t.region && <Chip label={t.region} size="small" />}
                  <Chip label={`${(t.holidays || []).length} holidays`} size="small" color="info" />
                </Stack>
                {t.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t.description}
                  </Typography>
                )}
                <Box sx={{ bgcolor: 'background.default', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">Holidays</Typography>
                  <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(t.holidays || [], null, 2)}
                  </pre>
                </Box>
              </Box>
              <CopyButton payload={t} />
            </Stack>
          </Box>
        ))}
        {holidayPresets.length === 0 && (
          <Typography variant="body2" color="text.secondary">No holiday presets available.</Typography>
        )}
      </Stack>
    </SectionCard>
  );

  return (
    <Layout>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <LibraryBooksIcon />
          <Box>
            <Typography variant="h5">Template Library</Typography>
            <Typography variant="body2" color="text.secondary">Browse company templates to seed your school setup.</Typography>
          </Box>
        </Stack>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card>
          <CardContent>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tab label="Streams" />
              <Tab label="Exam Patterns" />
              <Tab label="Holiday Presets" />
            </Tabs>
            {tab === 0 && renderStreams()}
            {tab === 1 && renderExamPatterns()}
            {tab === 2 && renderHolidays()}
          </CardContent>
        </Card>
      )}
    </Layout>
  );
};

export default SchoolTemplateLibrary;
