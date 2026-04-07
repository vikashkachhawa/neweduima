import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';

import Grid from '@mui/material/GridLegacy';
import { usePermission } from '../contexts/PermissionContext';
import * as api from '../services/api';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import UpgradeIcon from '@mui/icons-material/SystemUpgrade';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

/**
 * SubscriptionManagement - Super Admin Dashboard
 * 
 * USE CASES HANDLED:
 * 1. Create new subscription plans
 * 2. Assign plans to schools
 * 3. Upgrade schools to higher tier
 * 4. View all subscription statuses
 * 5. See expiring subscriptions and send reminders
 * 6. Manually suspend or restore subscriptions
 * 7. View subscription revenue and analytics
 */

export default function SubscriptionManagement() {
  const { hasPermission } = usePermission();
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dialog states
  const [openUpgradeDialog, setOpenUpgradeDialog] = useState(false);
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [renewalMonths, setRenewalMonths] = useState(12);

  useEffect(() => {
    if (hasPermission('manage_subscriptions')) {
      loadData();
    }
  }, [hasPermission]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, statsRes] = await Promise.all([
        api.get('/subscription/plans'),
        api.get('/subscription/statistics')
      ]);
      setPlans(plansRes.data);
      setStatistics(statsRes.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeSubscription = async () => {
    if (!selectedSchool || !selectedPlan) {
      alert('Please select both school and new plan');
      return;
    }

    try {
      await api.post('/subscription/upgrade-subscription', {
        school_id: selectedSchool.id,
        new_plan_id: selectedPlan
      });
      setOpenUpgradeDialog(false);
      loadData();
      alert('School upgraded successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Upgrade failed');
    }
  };

  const handleRestoreSubscription = async () => {
    if (!selectedSchool) {
      alert('Please select a school');
      return;
    }

    try {
      await api.post('/subscription/restore-subscription', {
        school_id: selectedSchool.id,
        renewal_months: renewalMonths
      });
      setOpenRestoreDialog(false);
      setSelectedSchool(null);
      loadData();
      alert('Subscription restored successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Restoration failed');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'error';
      case 'expired':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon />;
      case 'suspended':
        return <ErrorIcon />;
      case 'expired':
        return <WarningIcon />;
      default:
        return null;
    }
  };

  if (!hasPermission('manage_subscriptions')) {
    return (
      <Alert severity="error">
        You don't have permission to manage subscriptions
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Subscription Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Schools
                </Typography>
                <Typography variant="h4">
                  {statistics.activeCount + (statistics.suspendedCount || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Subscriptions
                </Typography>
                <Typography variant="h4" sx={{ color: 'success.main' }}>
                  {statistics.activeCount || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Suspended
                </Typography>
                <Typography variant="h4" sx={{ color: 'error.main' }}>
                  {statistics.suspendedCount || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Monthly Revenue
                </Typography>
                <Typography variant="h5">
                  ${statistics.totalRevenue?.toFixed(2) || '0.00'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Plan Distribution */}
      {statistics?.planDistribution && (
        <Card sx={{ mb: 3 }}>
          <CardHeader title="Plan Distribution" />
          <CardContent>
            {statistics.planDistribution.map((dist) => (
              <Box key={dist.plan_id} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">
                    <strong>{dist.plan_name}</strong> ({dist.schools} schools)
                  </Typography>
                  <Typography variant="body2">
                    {dist.users}/{dist.maxCapacity} users
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(dist.users / dist.maxCapacity) * 100}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Subscriptions Table */}
      <Card>
        <CardHeader
          title="All Subscriptions"
          action={
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadData}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />
        <CardContent>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>School Name</strong></TableCell>
                  <TableCell><strong>Plan</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Start Date</strong></TableCell>
                  <TableCell><strong>End Date</strong></TableCell>
                  <TableCell><strong>Days Left</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      No subscriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((sub) => (
                    <TableRow key={sub.id} hover>
                      <TableCell>{sub.school_name}</TableCell>
                      <TableCell>{sub.plan_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={sub.status}
                          color={getStatusColor(sub.status)}
                          icon={getStatusIcon(sub.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(sub.start_date)}</TableCell>
                      <TableCell>{formatDate(sub.end_date)}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            color: getDaysColor(sub.days_until_expiry),
                            fontWeight: 'bold'
                          }}
                        >
                          {sub.days_until_expiry}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={<UpgradeIcon />}
                          onClick={() => {
                            setSelectedSchool(sub);
                            setOpenUpgradeDialog(true);
                          }}
                        >
                          Upgrade
                        </Button>
                        {sub.status === 'suspended' && (
                          <Button
                            size="small"
                            color="success"
                            onClick={() => {
                              setSelectedSchool(sub);
                              setOpenRestoreDialog(true);
                            }}
                          >
                            Restore
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={openUpgradeDialog} onClose={() => setOpenUpgradeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upgrade Subscription</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            disabled
            fullWidth
            label="School"
            value={selectedSchool?.school_name || ''}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>New Plan</InputLabel>
            <Select
              value={selectedPlan || ''}
              onChange={(e) => setSelectedPlan(e.target.value)}
              label="New Plan"
            >
              {plans.map((plan) => (
                <MenuItem key={plan.id} value={plan.id}>
                  {plan.name} ({plan.max_users} users)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpgradeDialog(false)}>Cancel</Button>
          <Button
            onClick={handleUpgradeSubscription}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            Upgrade
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={openRestoreDialog} onClose={() => setOpenRestoreDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Restore Subscription</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            disabled
            fullWidth
            label="School"
            value={selectedSchool?.school_name || ''}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Renewal Period</InputLabel>
            <Select
              value={renewalMonths}
              onChange={(e) => setRenewalMonths(e.target.value)}
              label="Renewal Period"
            >
              <MenuItem value={1}>1 Month</MenuItem>
              <MenuItem value={3}>3 Months</MenuItem>
              <MenuItem value={6}>6 Months</MenuItem>
              <MenuItem value={12}>1 Year</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRestoreDialog(false)}>Cancel</Button>
          <Button
            onClick={handleRestoreSubscription}
            variant="contained"
            color="success"
            startIcon={<SaveIcon />}
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getDaysColor(daysLeft) {
  if (daysLeft <= 0) return '#d32f2f'; // Red
  if (daysLeft <= 7) return '#f57c00'; // Orange
  return '#388e3c'; // Green
}
