import React from 'react';
import Layout from '../components/Layout';
import { Box, Typography, Card, CardContent, Switch, FormControlLabel, Divider, Button } from '@mui/material';
import { motion } from 'framer-motion';

const SystemSettings = () => {
    return (
        <Layout>
            <Box sx={{ maxWidth: 900, mx: 'auto' }}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            System Settings
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Configure platform-wide features and controls
                        </Typography>
                    </Box>
                </motion.div>

                <Card elevation={2} sx={{ mb: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                            Feature Flags
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <FormControlLabel
                                control={<Switch defaultChecked />}
                                label="Enable AI Tools for all schools"
                            />
                            <FormControlLabel
                                control={<Switch defaultChecked />}
                                label="Allow school admins to create custom roles"
                            />
                            <FormControlLabel
                                control={<Switch />}
                                label="Enable advanced analytics dashboard"
                            />
                            <FormControlLabel
                                control={<Switch defaultChecked />}
                                label="Enable mobile app access"
                            />
                        </Box>
                    </CardContent>
                </Card>

                <Card elevation={2} sx={{ mb: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                            Platform Templates
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button variant="outlined">Manage Academic Year Templates</Button>
                            <Button variant="outlined">Manage Holiday Templates</Button>
                            <Button variant="outlined">Manage Grading Systems</Button>
                        </Box>
                    </CardContent>
                </Card>

                <Card elevation={2}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                            Audit Logs
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Track all system activities and changes
                        </Typography>
                        <Button variant="contained">View Audit Logs</Button>
                    </CardContent>
                </Card>
            </Box>
        </Layout>
    );
};

export default SystemSettings;
