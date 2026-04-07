import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

const InfoDialog = ({ open, title = 'Information', message, onClose, actions = null }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {typeof message === 'string' ? (
          <Typography color="text.secondary">{message}</Typography>
        ) : (
          message
        )}
      </DialogContent>
      <DialogActions>
        {actions ? (
          actions
        ) : (
          <Button onClick={onClose} variant="contained" fullWidth>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default InfoDialog;
