import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { superAdminService } from '../services';
import { Box, Typography, Card, CardContent, Button, Chip, CircularProgress, Tabs, Tab, IconButton, Tooltip, Stack } from '@mui/material';

import Grid from '@mui/material/GridLegacy';
import {
    ArrowBack,
    Cancel,
    CheckCircle,
    Payment,
    People,
    School,
    Settings as SettingsIcon,
    Storage
} from '@mui/icons-material';
import InfoDialog from '../components/InfoDialog';
import PromptDialog from '../components/PromptDialog';
import ConfirmDialog from '../components/ConfirmDialog';

const SchoolDetails = () => {
    const { schoolId } = useParams();
    const navigate = useNavigate();

    const [school, setSchool] = useState(null);
    const [loading, setLoading] = useState(true);
    const [detailTab, setDetailTab] = useState(0);
    const [moduleState, setModuleState] = useState({});
    const [statusUpdating, setStatusUpdating] = useState(false);

    const [infoDialog, setInfoDialog] = useState({ open: false, title: '', message: '' });
    const [cloneDialog, setCloneDialog] = useState({ open: false });
    const [confirmStatus, setConfirmStatus] = useState({ open: false, target: 'suspended' });
    const [confirmDelete, setConfirmDelete] = useState({ open: false });
    const [reasonDialog, setReasonDialog] = useState({ open: false, target: null });

    const loadSchool = async () => {
        try {
            setLoading(true);
            const data = await superAdminService.getSchoolById(schoolId);
            const currentSchool = data.school || data;
            const normalizedSchool = {
                ...currentSchool,
                modules: currentSchool.modules || { fees: true, attendance: true, lms: true, transport: false, exams: true, messaging: true },
                status: currentSchool.status || (currentSchool.is_active ? 'active' : 'suspended')
            };
            setSchool(normalizedSchool);
            setModuleState(normalizedSchool.modules || {});
        } catch (error) {
            setInfoDialog({
                open: true,
                title: 'Unable to Load School',
                message: error.response?.data?.message || 'Could not fetch school details.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSchool();
    }, [schoolId]);

    const handleModuleToggle = async (key) => {
        if (!school) return;
        const updated = { ...moduleState, [key]: !moduleState[key] };
        setModuleState(updated);
        try {
            await superAdminService.updateSchoolModules(school.id, updated);
            setSchool((prev) => ({ ...prev, modules: updated }));
        } catch (error) {
            setModuleState(moduleState);
            setInfoDialog({
                open: true,
                title: 'Update Failed',
                message: error.response?.data?.message || 'Could not update modules.'
            });
        }
    };

    const handleStatusChange = async (status, reason = null) => {
        if (!school) return;
        setStatusUpdating(true);
        try {
            await superAdminService.setSchoolStatus(school.id, status, reason);
            setSchool((prev) => ({ ...prev, status, is_active: status === 'active' }));
            setInfoDialog({ open: true, title: 'Status Updated', message: `School ${status === 'deleted' ? 'deleted' : status}${reason ? ` - Reason: ${reason}` : ''}.` });
        } catch (error) {
            setInfoDialog({ open: true, title: 'Status Update Failed', message: error.response?.data?.message || 'Error updating status' });
        } finally {
            setStatusUpdating(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
                    <CircularProgress size={56} />
                </Box>
            </Layout>
        );
    }

    if (!school) {
        return (
            <Layout>
                <Alert severity="error">School details are unavailable.</Alert>
                <Button sx={{ mt: 2 }} startIcon={<ArrowBack />} onClick={() => navigate('/schools')}>
                    Back to Schools
                </Button>
            </Layout>
        );
    }

    return (
        <Layout>
            <Box sx={{ maxWidth: 1300, mx: 'auto' }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/schools')} sx={{ mb: 2 }}>
                    Back to Schools
                </Button>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 52,
                            height: 52,
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <School />
                        </Box>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>{school.name}</Typography>
                            <Typography variant="body1" color="text.secondary">{school.location}</Typography>
                        </Box>
                        <Chip
                            label={school.status || (school.is_active ? 'active' : 'suspended')}
                            color={(school.status || (school.is_active ? 'active' : 'suspended')) === 'active' ? 'success' : 'error'}
                            sx={{ textTransform: 'capitalize' }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            color={school.status === 'suspended' ? 'success' : 'error'}
                            onClick={() => setConfirmStatus({ open: true, target: school.status === 'suspended' ? 'active' : 'suspended' })}
                            disabled={statusUpdating}
                        >
                            {school.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </Button>
                        <Button variant="outlined" color="error" onClick={() => setConfirmDelete({ open: true })} disabled={statusUpdating}>
                            Delete
                        </Button>
                        <Button variant="outlined" onClick={() => setCloneDialog({ open: true })}>Clone Setup</Button>
                        <Button variant="contained" startIcon={<SettingsIcon />}>Manage</Button>
                    </Box>
                </Box>

                <Tabs value={detailTab} onChange={(e, newValue) => setDetailTab(newValue)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="Overview" />
                    <Tab label="Users" />
                    <Tab label="Subscription" />
                    <Tab label="Modules" />
                    <Tab label="Activity" />
                </Tabs>

                {detailTab === 0 && (
                    <Box>
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={6} sm={3}>
                                <Card sx={{ p: 2, textAlign: 'center', backgroundColor: 'primary.light' }}>
                                    <People sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{school.userCount || 0}</Typography>
                                    <Typography variant="body2" color="text.secondary">Users</Typography>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Card sx={{ p: 2, textAlign: 'center', backgroundColor: 'success.light' }}>
                                    <Storage sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>2.4 GB</Typography>
                                    <Typography variant="body2" color="text.secondary">Storage</Typography>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Card sx={{ p: 2, textAlign: 'center', backgroundColor: 'warning.light' }}>
                                    <Payment sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>$99</Typography>
                                    <Typography variant="body2" color="text.secondary">Plan</Typography>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Card sx={{ p: 2, textAlign: 'center', backgroundColor: school.is_active ? 'success.lighter' : 'error.lighter' }}>
                                    {school.is_active ? <CheckCircle sx={{ fontSize: 32, color: 'success.main', mb: 1 }} /> : <Cancel sx={{ fontSize: 32, color: 'error.main', mb: 1 }} />}
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{school.is_active ? 'Active' : 'Inactive'}</Typography>
                                    <Typography variant="body2" color="text.secondary">Status</Typography>
                                </Card>
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>School Information</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Email</Typography>
                                <Typography variant="body1" sx={{ mb: 2 }}>{school.email}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Phone</Typography>
                                <Typography variant="body1" sx={{ mb: 2 }}>{school.phone || 'N/A'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Subdomain</Typography>
                                <Typography variant="body1" sx={{ mb: 2 }}>{school.subdomain}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Created On</Typography>
                                <Typography variant="body1" sx={{ mb: 2 }}>{new Date(school.created_at).toLocaleDateString()}</Typography>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {detailTab === 1 && (
                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell>John Smith</TableCell>
                                    <TableCell>john.smith@{school.subdomain}.edu</TableCell>
                                    <TableCell><Chip label="School Admin" size="small" color="primary" /></TableCell>
                                    <TableCell><Chip label="Active" size="small" color="success" /></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {detailTab === 2 && (
                    <Card sx={{ p: 3, backgroundColor: 'primary.lighter' }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Pro Plan</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            $99<Typography component="span" variant="body2">/month</Typography>
                        </Typography>
                    </Card>
                )}

                {detailTab === 3 && (
                    <Grid container spacing={2}>
                        {Object.entries(moduleState || {}).map(([key, value]) => (
                            <Grid item xs={12} sm={6} key={key}>
                                <FormControlLabel
                                    control={<Switch checked={!!value} onChange={() => handleModuleToggle(key)} />}
                                    label={key.charAt(0).toUpperCase() + key.slice(1)}
                                />
                            </Grid>
                        ))}
                    </Grid>
                )}

                {detailTab === 4 && (
                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date & Time</TableCell>
                                    <TableCell>Action</TableCell>
                                    <TableCell>User</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell>Recent</TableCell>
                                    <TableCell>User login</TableCell>
                                    <TableCell>System</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>

            <InfoDialog
                open={infoDialog.open}
                title={infoDialog.title}
                message={infoDialog.message}
                onClose={() => setInfoDialog({ open: false, title: '', message: '' })}
            />

            <ConfirmDialog
                open={confirmStatus.open}
                title={confirmStatus.target === 'active' ? 'Activate School' : 'Suspend School'}
                description={`Are you sure you want to ${confirmStatus.target === 'active' ? 'activate' : 'suspend'} ${school?.name}?`}
                confirmLabel={confirmStatus.target === 'active' ? 'Activate' : 'Suspend'}
                confirmColor={confirmStatus.target === 'active' ? 'success' : 'error'}
                onClose={() => setConfirmStatus({ open: false, target: 'suspended' })}
                onConfirm={async () => {
                    if (confirmStatus.target === 'suspended') {
                        setReasonDialog({ open: true, target: 'suspended' });
                        setConfirmStatus({ open: false, target: 'suspended' });
                    } else {
                        setConfirmStatus({ open: false, target: 'suspended' });
                        await handleStatusChange('active');
                    }
                }}
            />

            <ConfirmDialog
                open={confirmDelete.open}
                title="Delete School"
                description={`This will mark ${school?.name} as deleted and disable access. Continue?`}
                confirmLabel="Delete"
                confirmColor="error"
                onClose={() => setConfirmDelete({ open: false })}
                onConfirm={() => {
                    setReasonDialog({ open: true, target: 'deleted' });
                    setConfirmDelete({ open: false });
                }}
            />

            <PromptDialog
                open={cloneDialog.open}
                title="Clone School Setup"
                fields={[{ name: 'name', label: 'New School Name', required: true }, { name: 'location', label: 'Location (City, State)', required: true }]}
                onClose={() => setCloneDialog({ open: false })}
                submitLabel="Clone"
                onSubmit={async ({ name, location }) => {
                    try {
                        await superAdminService.cloneSchool(school.id, { name, location });
                        setCloneDialog({ open: false });
                        setInfoDialog({ open: true, title: 'Cloned', message: 'School cloned successfully.' });
                    } catch (error) {
                        setInfoDialog({ open: true, title: 'Clone Failed', message: error.response?.data?.message || 'Error cloning school' });
                    }
                }}
            />

            <PromptDialog
                open={reasonDialog.open}
                title={reasonDialog.target === 'deleted' ? 'Reason for Deletion' : 'Reason for Suspension'}
                fields={[
                  {
                    name: 'reason',
                    label: 'Select Reason',
                    type: 'select',
                    required: true,
                    options: [
                      { value: 'Due to Non Payment', label: 'Due to Non Payment' },
                      { value: 'Policy Breach', label: 'Policy Breach' },
                      { value: 'Other', label: 'Other' }
                    ]
                  },
                  {
                    name: 'otherReason',
                    label: 'Please specify the reason',
                    required: true,
                    multiline: true,
                    rows: 4,
                    showIf: (values) => values.reason === 'Other'
                  }
                ]}
                onClose={() => setReasonDialog({ open: false, target: null })}
                submitLabel={reasonDialog.target === 'deleted' ? 'Delete' : 'Suspend'}
                onSubmit={async (values) => {
                  const finalReason = values.reason === 'Other' ? values.otherReason : values.reason;
                  await handleStatusChange(reasonDialog.target, finalReason);
                  setReasonDialog({ open: false, target: null });
                }}
            />
        </Layout>
    );
};

export default SchoolDetails;
