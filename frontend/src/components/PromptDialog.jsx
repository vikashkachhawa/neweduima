import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

import Grid from '@mui/material/GridLegacy';

// fields: [{ name: 'name', label: 'Name', required: true, type: 'text|select', options: [] }, ...]
const PromptDialog = ({ open, title = 'Input', fields = [], initialValues = {}, onSubmit, onClose, submitLabel = 'Submit' }) => {
  const [values, setValues] = useState(initialValues || {});

  useEffect(() => {
    if (open) {
      // Initialize all field values
      const init = { ...initialValues };
      fields.forEach(f => {
        if (!(f.name in init)) {
          init[f.name] = '';
        }
      });
      setValues(init);
    }
  }, [open]);

  const handleChange = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
  };

  const handleSubmit = () => onSubmit && onSubmit(values);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown={false}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ pt: 2 }}>
          {fields.map((f) => {
            // Check if this field should be shown based on conditional logic
            const shouldShow = !f.showIf || f.showIf(values);
            if (!shouldShow) return null;

            if (f.type === 'select') {
              const labelId = `label-${f.name}`;
              return (
                <Grid item xs={12} sm={f.cols || 12} key={f.name}>
                  <FormControl fullWidth required={!!f.required}>
                    <InputLabel id={labelId}>{f.label}</InputLabel>
                    <Select
                      labelId={labelId}
                      id={f.name}
                      label={f.label}
                      value={values[f.name] || ''}
                      onChange={handleChange(f.name)}
                    >
                      <MenuItem value="">
                        <em>-- Select --</em>
                      </MenuItem>
                      {(f.options || []).map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              );
            }

            return (
              <Grid item xs={12} sm={f.cols || 12} key={f.name}>
                <TextField
                  fullWidth
                  label={f.label}
                  value={values[f.name] || ''}
                  onChange={handleChange(f.name)}
                  required={!!f.required}
                  type={f.type || 'text'}
                  multiline={f.multiline || false}
                  rows={f.rows || 1}
                  autoFocus={f.autoFocus !== false}
                />
              </Grid>
            );
          })}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">{submitLabel}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PromptDialog;
