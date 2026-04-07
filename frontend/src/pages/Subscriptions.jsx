import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Box, Typography, Card, CardContent, Chip, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

import Grid from '@mui/material/GridLegacy';
import { motion } from 'framer-motion';
import { Add, CheckCircle, Block } from '@mui/icons-material';

const Subscriptions = () => {
    const plans = [
        { name: 'Free', price: '$0', schools: 12, features: ['50 Users', '1GB Storage', 'Basic Support'] },
        { name: 'Pro', price: '$99', schools: 45, features: ['500 Users', '50GB Storage', 'Priority Support', 'AI Tools'] },
        { name: 'Enterprise', price: '$499', schools: 23, features: ['Unlimited Users', '500GB Storage', '24/7 Support', 'Advanced AI', 'Custom Features'] },
    ];

    return (
        <Layout>
            <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                                Subscription & Billing
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Manage plans, pricing, and billing for schools
                            </Typography>
                        </Box>
                        <Button variant="contained" startIcon={<Add />}>
                            Create Plan
                        </Button>
                    </Box>
                </motion.div>

                <Grid container spacing={3} sx={{ mb: 4 }}>
                    {plans.map((plan, index) => (
                        <Grid item xs={12} md={4} key={index}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card elevation={2}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                            {plan.name}
                                        </Typography>
                                        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
                                            {plan.price}<Typography component="span" variant="body2">/month</Typography>
                                        </Typography>
                                        <Chip label={`${plan.schools} Schools`} color="primary" size="small" sx={{ mb: 2 }} />
                                        <Box sx={{ mt: 2 }}>
                                            {plan.features.map((feature, i) => (
                                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                    <CheckCircle sx={{ fontSize: 18, mr: 1, color: 'success.main' }} />
                                                    <Typography variant="body2">{feature}</Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>

                <Card elevation={2}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                            Recent Transactions
                        </Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>School</TableCell>
                                        <TableCell>Plan</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Date</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Springfield High School</TableCell>
                                        <TableCell><Chip label="Pro" size="small" color="primary" /></TableCell>
                                        <TableCell>$99.00</TableCell>
                                        <TableCell><Chip label="Paid" size="small" color="success" icon={<CheckCircle />} /></TableCell>
                                        <TableCell>Dec 26, 2025</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Lincoln Academy</TableCell>
                                        <TableCell><Chip label="Enterprise" size="small" color="secondary" /></TableCell>
                                        <TableCell>$499.00</TableCell>
                                        <TableCell><Chip label="Paid" size="small" color="success" icon={<CheckCircle />} /></TableCell>
                                        <TableCell>Dec 25, 2025</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Westview International</TableCell>
                                        <TableCell><Chip label="Pro" size="small" color="primary" /></TableCell>
                                        <TableCell>$99.00</TableCell>
                                        <TableCell><Chip label="Paid" size="small" color="success" icon={<CheckCircle />} /></TableCell>
                                        <TableCell>Dec 24, 2025</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Riverside School</TableCell>
                                        <TableCell><Chip label="Free" size="small" /></TableCell>
                                        <TableCell>$0.00</TableCell>
                                        <TableCell><Chip label="Active" size="small" color="info" /></TableCell>
                                        <TableCell>Dec 20, 2025</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Mountain View Academy</TableCell>
                                        <TableCell><Chip label="Pro" size="small" color="primary" /></TableCell>
                                        <TableCell>$99.00</TableCell>
                                        <TableCell><Chip label="Pending" size="small" color="warning" /></TableCell>
                                        <TableCell>Dec 26, 2025</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Box>
        </Layout>
    );
};

export default Subscriptions;
