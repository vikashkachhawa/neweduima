import React from 'react';
import Layout from '../components/Layout';
import { Box, Typography, Card, CardContent, TextField, FormControlLabel, Switch, Button, Chip } from '@mui/material';

import Grid from '@mui/material/GridLegacy';
import { motion } from 'framer-motion';
import { Security as SecurityIcon, VpnKey, Backup } from '@mui/icons-material';

const Security = () => {
    return (
        <Layout>
            <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            Security & Compliance
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Manage platform security policies and data compliance
                        </Typography>
                    </Box>
                </motion.div>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card elevation={2}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                    <VpnKey sx={{ fontSize: 32, color: 'primary.main' }} />
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Password Policies
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <TextField
                                        label="Minimum Password Length"
                                        type="number"
                                        defaultValue={8}
                                        size="small"
                                    />
                                    <FormControlLabel
                                        control={<Switch defaultChecked />}
                                        label="Require uppercase letters"
                                    />
                                    <FormControlLabel
                                        control={<Switch defaultChecked />}
                                        label="Require numbers"
                                    />
                                    <FormControlLabel
                                        control={<Switch defaultChecked />}
                                        label="Require special characters"
                                    />
                                    <FormControlLabel
                                        control={<Switch />}
                                        label="Enable Two-Factor Authentication (2FA)"
                                    />
                                    <Button variant="contained" sx={{ mt: 2 }}>
                                        Save Policy
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card elevation={2}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                    <SecurityIcon sx={{ fontSize: 32, color: 'success.main' }} />
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Data Compliance
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            GDPR Compliance Status
                                        </Typography>
                                        <Chip label="Compliant" color="success" />
                                    </Box>
                                    <Button variant="outlined" fullWidth>
                                        Export School Data (GDPR)
                                    </Button>
                                    <Button variant="outlined" fullWidth>
                                        View Data Processing Agreement
                                    </Button>
                                    <Button variant="outlined" fullWidth>
                                        User Privacy Settings
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12}>
                        <Card elevation={2}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                    <Backup sx={{ fontSize: 32, color: 'warning.main' }} />
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Backup & Recovery
                                    </Typography>
                                </Box>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Last Backup
                                            </Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 600, mt: 1 }}>
                                                2 hours ago
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Backup Size
                                            </Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 600, mt: 1 }}>
                                                3.2 GB
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Button variant="contained" fullWidth sx={{ height: '100%' }}>
                                            Backup Now
                                        </Button>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Button variant="outlined" fullWidth sx={{ height: '100%' }}>
                                            Restore
                                        </Button>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </Layout>
    );
};

export default Security;
