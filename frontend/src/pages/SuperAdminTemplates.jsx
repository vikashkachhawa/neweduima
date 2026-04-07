import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { superAdminTemplateService } from '../services';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';

import Grid from '@mui/material/GridLegacy';
import {
  LibraryBooks as LibraryBooksIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon
} from '@mui/icons-material';

const StreamsPanel = ({ templates, form, setForm, onSave, loading }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={5}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <LibraryBooksIcon fontSize="small" />
              <Typography variant="h6">Add Stream Template</Typography>
            </Stack>
            <Stack spacing={2}>
              <TextField
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <TextField
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                multiline
                minRows={2}
              />
              <TextField
                label="Stream Key (optional)"
                value={form.stream_key}
                onChange={(e) => setForm({ ...form, stream_key: e.target.value })}
              />
              <TextField
                label="Subjects (comma separated)"
                value={form.subjects}
                onChange={(e) => setForm({ ...form, subjects: e.target.value })}
                helperText="Example: Math, Physics, Chemistry"
              />
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={onSave}
                disabled={loading}
              >
                Save Template
              </Button>
              <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, border: '1px dashed', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Example</Typography>
                <Typography variant="body2" color="text.secondary">
                  Name: Science Stream<br/>
                  Stream Key: sci<br/>
                  Subjects: Math, Physics, Chemistry
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={7}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6">Stream Templates</Typography>
              <Chip label={templates.length} color="primary" size="small" />
            </Stack>
            <Stack spacing={2}>
              {templates.map((t) => (
                <Box key={t.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
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
              ))}
              {templates.length === 0 && (
                <Typography variant="body2" color="text.secondary">No stream templates yet.</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const ExamPatternsPanel = ({ templates, form, setForm, onSave, loading }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={5}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <LibraryBooksIcon fontSize="small" />
              <Typography variant="h6">Add Exam Pattern Template</Typography>
            </Stack>
            <Stack spacing={2}>
              <TextField
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <TextField
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                multiline
                minRows={2}
              />
              <TextField
                label="Pattern JSON"
                value={form.pattern}
                onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                multiline
                minRows={6}
                helperText="Provide structured exam pattern (terms, weights, grading)."
              />
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={onSave}
                disabled={loading}
              >
                Save Template
              </Button>
              <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, border: '1px dashed', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Example JSON</Typography>
                <pre style={{ margin: 0, fontSize: 12 }}>
{`{"terms":[{"name":"Term 1","weight":40},{"name":"Term 2","weight":60}],"grading":{"A":90,"B":80}}`}
                </pre>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={7}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6">Exam Pattern Templates</Typography>
              <Chip label={templates.length} color="primary" size="small" />
            </Stack>
            <Stack spacing={2}>
              {templates.map((t) => (
                <Box key={t.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
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
              ))}
              {templates.length === 0 && (
                <Typography variant="body2" color="text.secondary">No exam pattern templates yet.</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const HolidayPanel = ({ templates, form, setForm, onSave, loading }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={5}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <LibraryBooksIcon fontSize="small" />
              <Typography variant="h6">Add Holiday Preset</Typography>
            </Stack>
            <Stack spacing={2}>
              <TextField
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <TextField
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                multiline
                minRows={2}
              />
              <TextField
                label="Region (optional)"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              />
              <TextField
                label="Holidays JSON"
                value={form.holidays}
                onChange={(e) => setForm({ ...form, holidays: e.target.value })}
                multiline
                minRows={6}
                helperText='Example: [{"name":"Diwali","date":"2025-10-20"}]'
              />
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={onSave}
                disabled={loading}
              >
                Save Preset
              </Button>
              <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, border: '1px dashed', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Example JSON</Typography>
                <pre style={{ margin: 0, fontSize: 12 }}>
{`[{"name":"New Year","date":"2026-01-01"},{"name":"Diwali","date":"2026-11-05"}]`}
                </pre>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={7}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6">Holiday Presets</Typography>
              <Chip label={templates.length} color="primary" size="small" />
            </Stack>
            <Stack spacing={2}>
              {templates.map((t) => (
                <Box key={t.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
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
              ))}
              {templates.length === 0 && (
                <Typography variant="body2" color="text.secondary">No holiday presets yet.</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const SuperAdminTemplates = () => {
  const [tab, setTab] = useState(0);
  const [streams, setStreams] = useState([]);
  const [examPatterns, setExamPatterns] = useState([]);
  const [holidayPresets, setHolidayPresets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [streamForm, setStreamForm] = useState({ name: '', description: '', stream_key: '', subjects: '' });
  const [examForm, setExamForm] = useState({ name: '', description: '', pattern: '{"terms":[]}' });
  const [holidayForm, setHolidayForm] = useState({ name: '', description: '', region: '', holidays: '[]' });

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, e, h] = await Promise.all([
        superAdminTemplateService.listStreams(),
        superAdminTemplateService.listExamPatterns(),
        superAdminTemplateService.listHolidayPresets()
      ]);
      setStreams(s.templates || []);
      setExamPatterns(e.templates || []);
      setHolidayPresets(h.presets || []);
    } catch (err) {
      setError('Failed to load templates.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleStreamSave = async () => {
    setError('');
    setMessage('');
    const subjects = streamForm.subjects
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!streamForm.name || subjects.length === 0) {
      setError('Name and at least one subject are required.');
      return;
    }

    try {
      await superAdminTemplateService.createStream({
        name: streamForm.name,
        description: streamForm.description,
        stream_key: streamForm.stream_key || null,
        subjects
      });
      setMessage('Stream template saved.');
      setStreamForm({ name: '', description: '', stream_key: '', subjects: '' });
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save stream template.');
    }
  };

  const handleExamSave = async () => {
    setError('');
    setMessage('');
    let pattern;
    try {
      pattern = examForm.pattern ? JSON.parse(examForm.pattern) : {};
    } catch (e) {
      setError('Pattern JSON is invalid.');
      return;
    }

    if (!examForm.name) {
      setError('Name is required.');
      return;
    }

    try {
      await superAdminTemplateService.createExamPattern({
        name: examForm.name,
        description: examForm.description,
        pattern
      });
      setMessage('Exam pattern template saved.');
      setExamForm({ name: '', description: '', pattern: '{"terms":[]}' });
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save exam pattern template.');
    }
  };

  const handleHolidaySave = async () => {
    setError('');
    setMessage('');
    let holidays;
    try {
      holidays = holidayForm.holidays ? JSON.parse(holidayForm.holidays) : [];
      if (!Array.isArray(holidays)) throw new Error('Holidays must be an array.');
    } catch (e) {
      setError('Holidays JSON must be an array.');
      return;
    }

    if (!holidayForm.name) {
      setError('Name is required.');
      return;
    }

    try {
      await superAdminTemplateService.createHolidayPreset({
        name: holidayForm.name,
        description: holidayForm.description,
        region: holidayForm.region || null,
        holidays
      });
      setMessage('Holiday preset saved.');
      setHolidayForm({ name: '', description: '', region: '', holidays: '[]' });
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save holiday preset.');
    }
  };

  const content = useMemo(() => {
    if (tab === 0) return (
      <StreamsPanel
        templates={streams}
        form={streamForm}
        setForm={setStreamForm}
        onSave={handleStreamSave}
        loading={loading}
      />
    );
    if (tab === 1) return (
      <ExamPatternsPanel
        templates={examPatterns}
        form={examForm}
        setForm={setExamForm}
        onSave={handleExamSave}
        loading={loading}
      />
    );
    return (
      <HolidayPanel
        templates={holidayPresets}
        form={holidayForm}
        setForm={setHolidayForm}
        onSave={handleHolidaySave}
        loading={loading}
      />
    );
  }, [tab, streams, streamForm, examPatterns, examForm, holidayPresets, holidayForm, loading]);

  return (
    <Layout>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <LibraryBooksIcon />
          <Box>
            <Typography variant="h5">Template Library</Typography>
            <Typography variant="body2" color="text.secondary">Super Admin can define reusable school templates.</Typography>
          </Box>
        </Stack>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadAll} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {(error || message) && (
        <Box sx={{ mb: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success" sx={{ mt: error ? 1 : 0 }}>{message}</Alert>}
        </Box>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Stream Templates" />
            <Tab label="Exam Patterns" />
            <Tab label="Holiday Presets" />
          </Tabs>
          <Divider sx={{ mb: 3 }} />
          {content}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default SuperAdminTemplates;
