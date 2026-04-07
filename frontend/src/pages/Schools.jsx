import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminService } from '../services';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Skeleton, Stack, TextField, Typography } from '@mui/material';

import Grid from '@mui/material/GridLegacy';
import { 
    Add, 
    School, 
    CheckCircle, 
    Cancel, 
    Search, 
    FilterList, 
    People, 
    Storage, 
    Payment, 
    Security,
    History,
    Settings as SettingsIcon,
    Close
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import InfoDialog from '../components/InfoDialog';
import PromptDialog from '../components/PromptDialog';
import ConfirmDialog from '../components/ConfirmDialog';

const INITIAL_FORM_STATE = {
    name: '',
    location: '',
    email: '',
    countryCode: '',
    phoneNumber: '',
    address: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: ''
};

const COUNTRY_API_URL = 'https://restcountries.com/v3.1/all?fields=name,idd,flag,cca2';
const COUNTRY_PHONE_RULES = {
    '+91': { exact: 10, label: 'India' }
};

const buildCountriesList = (countriesResponse = []) => {
    const mapped = [];

    countriesResponse.forEach((country) => {
        const countryName = country?.name?.common || 'Unknown';
        const flag = country?.flag || '';
        const countryCode = country?.cca2 || '';
        const iddRoot = country?.idd?.root || '';
        const suffixes = Array.isArray(country?.idd?.suffixes) ? country.idd.suffixes : [];

        if (!iddRoot || suffixes.length === 0) {
            mapped.push({
                id: `${countryCode}-none`,
                name: countryName,
                flag,
                cca2: countryCode,
                dialCode: ''
            });
            return;
        }

        suffixes.forEach((suffix) => {
            const dialCode = `${iddRoot}${suffix}`;
            mapped.push({
                id: `${countryCode}-${dialCode}`,
                name: countryName,
                flag,
                cca2: countryCode,
                dialCode
            });
        });
    });

    mapped.sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name);
        if (nameCompare !== 0) return nameCompare;
        return a.dialCode.localeCompare(b.dialCode);
    });

    return mapped;
};

const Schools = () => {
    const [schools, setSchools] = useState([]);
    const [filteredSchools, setFilteredSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [formErrors, setFormErrors] = useState({});
    const [touchedFields, setTouchedFields] = useState({});
    const [submitErrors, setSubmitErrors] = useState([]);
    const [countries, setCountries] = useState([]);
    const [countriesLoading, setCountriesLoading] = useState(false);
    const [countriesError, setCountriesError] = useState('');
    const [countriesFetchAttempted, setCountriesFetchAttempted] = useState(false);
    const [isCreatingSchool, setIsCreatingSchool] = useState(false);

    const countryDialCodeOptions = countries.filter((country) => !!country.dialCode);
    const [createdSchool, setCreatedSchool] = useState(null);
    const [infoDialog, setInfoDialog] = useState({ open: false, title: '', message: '' });
    const navigate = useNavigate();

    useEffect(() => {
        fetchSchools();
    }, []);

    useEffect(() => {
        if (!showModal || countries.length > 0 || countriesLoading || countriesFetchAttempted) return;

        const fetchCountries = async () => {
            setCountriesLoading(true);
            setCountriesFetchAttempted(true);
            setCountriesError('');

            try {
                const response = await fetch(COUNTRY_API_URL);
                if (!response.ok) {
                    throw new Error(`Country API failed with ${response.status}`);
                }

                const data = await response.json();
                const parsed = buildCountriesList(data);
                setCountries(parsed);
                if (parsed.length === 0) {
                    setCountriesError('Could not load countries with dial codes. Please try again.');
                }
            } catch (error) {
                console.error('Country fetch error:', error);
                setCountriesError('Unable to fetch country list right now. Check your internet connection and try again.');
            } finally {
                setCountriesLoading(false);
            }
        };

        fetchCountries();
    }, [showModal, countries.length, countriesLoading, countriesFetchAttempted]);

    const validateField = (field, data) => {
        const value = data[field];

        if (field === 'name') {
            if (!value.trim()) return 'School name is required';
            if (value.trim().length < 2) return 'School name must be at least 2 characters';
            return '';
        }

        if (field === 'location') {
            if (!value.trim()) return 'Location is required';
            if (value.trim().length < 2) return 'Location must be at least 2 characters';
            return '';
        }

        if (field === 'email') {
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid school email address';
            return '';
        }

        if (field === 'countryCode') {
            if (!value.trim()) return 'Country code is required';
            if (!/^\+\d{1,4}$/.test(value.trim())) return 'Country code format should be like +91 or +1';
            return '';
        }

        if (field === 'phoneNumber') {
            if (!value.trim()) return 'Phone number is required';
            if (!/^\d+$/.test(value.trim())) return 'Phone number should contain digits only';

            const selectedRule = COUNTRY_PHONE_RULES[data.countryCode?.trim()];
            if (selectedRule?.exact && value.trim().length !== selectedRule.exact) {
                return `${selectedRule.label} phone number must be exactly ${selectedRule.exact} digits`;
            }

            if (value.trim().length < 6 || value.trim().length > 15) {
                return 'Phone number should contain 6 to 15 digits';
            }

            return '';
        }

        if (field === 'adminFirstName') {
            if (!value.trim()) return 'Admin first name is required';
            return '';
        }

        if (field === 'adminLastName') {
            if (!value.trim()) return 'Admin last name is required';
            return '';
        }

        if (field === 'adminEmail') {
            if (!value.trim()) return 'Admin email is required';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid admin email address';
            return '';
        }

        return '';
    };

    const getAllFormErrors = (data) => {
        const fieldsToValidate = ['name', 'location', 'email', 'countryCode', 'phoneNumber', 'adminFirstName', 'adminLastName', 'adminEmail'];
        const errors = {};

        fieldsToValidate.forEach((field) => {
            const errorMessage = validateField(field, data);
            if (errorMessage) {
                errors[field] = errorMessage;
            }
        });

        return errors;
    };

    const handleFieldChange = (field, nextValue) => {
        setFormData((prev) => {
            const nextData = { ...prev, [field]: nextValue };

            setFormErrors((prevErrors) => {
                const nextErrors = { ...prevErrors };
                if (touchedFields[field]) {
                    nextErrors[field] = validateField(field, nextData);
                }
                if (field === 'countryCode' && touchedFields.phoneNumber) {
                    nextErrors.phoneNumber = validateField('phoneNumber', nextData);
                }
                return nextErrors;
            });

            return nextData;
        });
    };

    const handleFieldBlur = (field) => {
        setTouchedFields((prev) => ({ ...prev, [field]: true }));
        setFormErrors((prev) => ({
            ...prev,
            [field]: validateField(field, formData)
        }));
    };

    const mapApiErrors = (error) => {
        const details = error?.response?.data?.errors;
        if (!Array.isArray(details)) return { fieldMap: {}, allMessages: [] };

        const fieldMap = {};
        const allMessages = [];

        details.forEach((item) => {
            const field = item?.field || item?.param || 'general';
            const message = item?.message || item?.msg || 'Unknown validation error';
            if (!fieldMap[field]) {
                fieldMap[field] = message;
            }
            allMessages.push(message);
        });

        return { fieldMap, allMessages };
    };

    const fetchSchools = async () => {
        try {
            const data = await superAdminService.getAllSchools();
            const enriched = (data.schools || []).map((s) => ({
                ...s,
                modules: s.modules || { fees: true, attendance: true, lms: true, transport: false, exams: true, messaging: true },
                status: s.status || (s.is_active ? 'active' : 'suspended')
            }));
            setSchools(enriched);
            setFilteredSchools(enriched);
        } catch (error) {
            console.error('Error fetching schools:', error);
            // Set dummy data if API fails
            const dummySchools = [
                { id: 1, name: 'Springfield High School', location: 'Springfield, IL', email: 'admin@springfield.edu', phone: '555-0101', subdomain: 'springfield', userCount: 450, is_active: true, status: 'active', modules: { fees: true, attendance: true, lms: true, transport: false, exams: true, messaging: true }, created_at: '2024-01-15' },
                { id: 2, name: 'Lincoln Academy', location: 'Chicago, IL', email: 'contact@lincoln.edu', phone: '555-0102', subdomain: 'lincoln', userCount: 320, is_active: true, status: 'active', modules: { fees: true, attendance: true, lms: true, transport: true, exams: true, messaging: true }, created_at: '2024-02-20' },
                { id: 3, name: 'Westview International', location: 'Austin, TX', email: 'info@westview.edu', phone: '555-0103', subdomain: 'westview', userCount: 580, is_active: true, status: 'active', modules: { fees: true, attendance: true, lms: true, transport: false, exams: true, messaging: true }, created_at: '2024-03-10' },
                { id: 4, name: 'Riverside School', location: 'Portland, OR', email: 'admin@riverside.edu', phone: '555-0104', subdomain: 'riverside', userCount: 290, is_active: false, status: 'suspended', modules: { fees: true, attendance: true, lms: true, transport: false, exams: true, messaging: false }, created_at: '2024-01-25' },
                { id: 5, name: 'Mountain View Academy', location: 'Denver, CO', email: 'contact@mountainview.edu', phone: '555-0105', subdomain: 'mountainview', userCount: 410, is_active: true, status: 'active', modules: { fees: true, attendance: true, lms: true, transport: true, exams: true, messaging: true }, created_at: '2024-04-05' },
                { id: 6, name: 'Oakwood High', location: 'Seattle, WA', email: 'info@oakwood.edu', phone: '555-0106', subdomain: 'oakwood', userCount: 365, is_active: true, status: 'active', modules: { fees: true, attendance: true, lms: true, transport: false, exams: true, messaging: true }, created_at: '2024-02-14' },
                { id: 7, name: 'Sunset Valley School', location: 'Phoenix, AZ', email: 'admin@sunsetvalley.edu', phone: '555-0107', subdomain: 'sunsetvalley', userCount: 275, is_active: true, status: 'active', modules: { fees: false, attendance: true, lms: true, transport: false, exams: true, messaging: true }, created_at: '2024-03-22' },
                { id: 8, name: 'Harbor Point Academy', location: 'San Diego, CA', email: 'contact@harborpoint.edu', phone: '555-0108', subdomain: 'harborpoint', userCount: 195, is_active: false, status: 'suspended', modules: { fees: true, attendance: true, lms: false, transport: false, exams: true, messaging: false }, created_at: '2024-01-30' },
            ];
            setSchools(dummySchools);
            setFilteredSchools(dummySchools);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let result = schools;
        
        // Apply search filter
        if (searchQuery) {
            result = result.filter(school => 
                school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                school.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                school.email.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        // Apply status filter
        if (statusFilter !== 'all') {
            result = result.filter(school => 
                statusFilter === 'active' ? school.is_active : !school.is_active
            );
        }
        
        setFilteredSchools(result);
    }, [searchQuery, statusFilter, schools]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const clientErrors = getAllFormErrors(formData);
        if (Object.keys(clientErrors).length > 0) {
            setTouchedFields({
                name: true,
                location: true,
                email: true,
                countryCode: true,
                phoneNumber: true,
                adminFirstName: true,
                adminLastName: true,
                adminEmail: true
            });
            setFormErrors(clientErrors);
            setSubmitErrors(Object.values(clientErrors));
            return;
        }

        setFormErrors({});
        setSubmitErrors([]);
        setIsCreatingSchool(true);

        const payload = {
            ...formData,
            name: formData.name.trim(),
            location: formData.location.trim(),
            email: formData.email.trim(),
            countryCode: formData.countryCode.trim(),
            phoneNumber: formData.phoneNumber.trim(),
            address: formData.address.trim(),
            adminEmail: formData.adminEmail.trim(),
            adminFirstName: formData.adminFirstName.trim(),
            adminLastName: formData.adminLastName.trim()
        };

        try {
            const data = await superAdminService.createSchool(payload);
            setCreatedSchool(data);
            fetchSchools();
            setFormData(INITIAL_FORM_STATE);
            setFormErrors({});
            setTouchedFields({});
            setSubmitErrors([]);
        } catch (error) {
            const { fieldMap, allMessages } = mapApiErrors(error);
            if (Object.keys(fieldMap).length > 0) {
                setFormErrors((prev) => ({ ...prev, ...fieldMap }));
                setSubmitErrors(allMessages);
            }

            setInfoDialog({
                open: true,
                title: 'Create School Failed',
                message: error.response?.data?.message || 'Error creating school'
            });
        } finally {
            setIsCreatingSchool(false);
        }
    };

    const handleCloseSuccess = () => {
        setCreatedSchool(null);
        setShowModal(false);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setFormData(INITIAL_FORM_STATE);
        setFormErrors({});
        setTouchedFields({});
        setSubmitErrors([]);
        setCountriesError('');
        if (countries.length === 0) {
            setCountriesFetchAttempted(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <Box className="flex items-center justify-center h-64">
                    <CircularProgress size={60} />
                </Box>
            </Layout>
        );
    }

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
                                Schools Management
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Manage all schools in the platform
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setShowModal(true)}
                            sx={{ fontWeight: 600 }}
                        >
                            Add School
                        </Button>
                    </Box>

                    {/* Search and Filters */}
                    <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                            placeholder="Search schools..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{ flex: 1, minWidth: 300 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            sx={{ minWidth: 150 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <FilterList />
                                    </InputAdornment>
                                ),
                            }}
                        >
                            <MenuItem value="all">All Status</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                        </TextField>
                    </Box>
                </motion.div>

                <Grid container spacing={3}>
                    <AnimatePresence>
                        {filteredSchools.map((school, index) => (
                            <Grid item xs={12} sm={6} md={4} key={school.id}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card 
                                        elevation={2}
                                        onClick={() => navigate(`/schools/${school.id}`)}
                                        sx={{
                                            height: '100%',
                                            transition: 'all 0.3s ease',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 4,
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                                    <Box sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 2,
                                                        background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white'
                                                    }}>
                                                        <School sx={{ fontSize: 22 }} />
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                            {school.name}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {school.location}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Chip
                                                    icon={(school.status || (school.is_active ? 'active' : 'inactive')) === 'active' ? <CheckCircle /> : <Cancel />}
                                                    label={school.status || (school.is_active ? 'active' : 'inactive')}
                                                    color={(school.status || (school.is_active ? 'active' : 'inactive')) === 'active' ? 'success' : 'error'}
                                                    size="small"
                                                    sx={{ textTransform: 'capitalize' }}
                                                />
                                            </Box>
                                            
                                            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                    <strong>Subdomain:</strong> {school.subdomain}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                    <strong>Users:</strong> {school.userCount || 0}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Email:</strong> {school.email}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </Grid>
                        ))}
                    </AnimatePresence>
                </Grid>

                {showModal && !createdSchool && (
                    <Dialog 
                        open={showModal} 
                        onClose={handleCloseModal}
                        maxWidth="md"
                        fullWidth
                        PaperProps={{
                            component: motion.div,
                            initial: { opacity: 0, scale: 0.9 },
                            animate: { opacity: 1, scale: 1 },
                            exit: { opacity: 0, scale: 0.9 },
                        }}
                    >
                        <DialogTitle className="text-gray-900 dark:text-gray-100">
                            Add New School
                        </DialogTitle>
                        <DialogContent>
                            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                                {(submitErrors.length > 0 || countriesError) && (
                                    <Alert severity="error" sx={{ mb: 2 }}>
                                        {countriesError && (
                                            <Typography variant="body2" sx={{ mb: submitErrors.length > 0 ? 1 : 0 }}>
                                                {countriesError}
                                            </Typography>
                                        )}
                                        {submitErrors.map((message, index) => (
                                            <Typography key={`${message}-${index}`} variant="body2">
                                                {`${index + 1}. ${message}`}
                                            </Typography>
                                        ))}
                                    </Alert>
                                )}

                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="School Name"
                                            value={formData.name}
                                            onChange={(e) => handleFieldChange('name', e.target.value)}
                                            onBlur={() => handleFieldBlur('name')}
                                            error={!!formErrors.name}
                                            helperText={touchedFields.name ? formErrors.name : ''}
                                            required
                                            variant="outlined"
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Location"
                                            value={formData.location}
                                            onChange={(e) => handleFieldChange('location', e.target.value)}
                                            onBlur={() => handleFieldBlur('location')}
                                            error={!!formErrors.location}
                                            helperText={touchedFields.location ? formErrors.location : ''}
                                            required
                                            variant="outlined"
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleFieldChange('email', e.target.value)}
                                            onBlur={() => handleFieldBlur('email')}
                                            error={!!formErrors.email}
                                            helperText={touchedFields.email ? formErrors.email : ''}
                                            variant="outlined"
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        {countries.length > 0 ? (
                                            <Autocomplete
                                                fullWidth
                                                options={countryDialCodeOptions}
                                                loading={countriesLoading}
                                                value={countryDialCodeOptions.find((country) => country.dialCode === formData.countryCode) || null}
                                                onChange={(event, selectedCountry) => {
                                                    handleFieldChange('countryCode', selectedCountry?.dialCode || '');
                                                }}
                                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                                getOptionLabel={(option) => `${option.flag ? `${option.flag} ` : ''}${option.name} (${option.dialCode})`}
                                                noOptionsText="No matching country code"
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label={countriesLoading ? 'Loading country codes...' : 'Country Code'}
                                                        onBlur={() => handleFieldBlur('countryCode')}
                                                        error={!!formErrors.countryCode}
                                                        helperText={touchedFields.countryCode ? (formErrors.countryCode || '') : `Loaded ${countryDialCodeOptions.length} country code entries`}
                                                        required
                                                        variant="outlined"
                                                    />
                                                )}
                                                renderOption={(props, option) => (
                                                    <li {...props} key={option.id}>
                                                        {option.flag ? `${option.flag} ` : ''}
                                                        {option.name} ({option.dialCode})
                                                    </li>
                                                )}
                                                disabled={countriesLoading}
                                            />
                                        ) : (
                                            <TextField
                                                fullWidth
                                                label={countriesLoading ? 'Loading country codes...' : 'Country Code'}
                                                value={formData.countryCode}
                                                onChange={(e) => handleFieldChange('countryCode', e.target.value)}
                                                onBlur={() => handleFieldBlur('countryCode')}
                                                error={!!formErrors.countryCode}
                                                helperText={touchedFields.countryCode ? formErrors.countryCode : 'Enter format like +91'}
                                                required
                                                variant="outlined"
                                            />
                                        )}
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Phone Number"
                                            value={formData.phoneNumber}
                                            onChange={(e) => {
                                                const digitsOnly = e.target.value.replace(/\D/g, '');
                                                    handleFieldChange('phoneNumber', digitsOnly);
                                            }}
                                                onBlur={() => handleFieldBlur('phoneNumber')}
                                            error={!!formErrors.phoneNumber}
                                            helperText={touchedFields.phoneNumber ? (formErrors.phoneNumber || '') : (formData.countryCode === '+91' ? 'India requires exactly 10 digits' : 'Enter only digits, no spaces or symbols')}
                                            required
                                            variant="outlined"
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Address"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            variant="outlined"
                                            multiline
                                            rows={2}
                                        />
                                    </Grid>
                                </Grid>

                                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 3, mt: 3 }}>
                                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                                        School Admin Details
                                    </Typography>
                                    
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="First Name"
                                                value={formData.adminFirstName}
                                                onChange={(e) => handleFieldChange('adminFirstName', e.target.value)}
                                                onBlur={() => handleFieldBlur('adminFirstName')}
                                                error={!!formErrors.adminFirstName}
                                                helperText={touchedFields.adminFirstName ? formErrors.adminFirstName : ''}
                                                required
                                                variant="outlined"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Last Name"
                                                value={formData.adminLastName}
                                                onChange={(e) => handleFieldChange('adminLastName', e.target.value)}
                                                onBlur={() => handleFieldBlur('adminLastName')}
                                                error={!!formErrors.adminLastName}
                                                helperText={touchedFields.adminLastName ? formErrors.adminLastName : ''}
                                                required
                                                variant="outlined"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Admin Email"
                                                type="email"
                                                value={formData.adminEmail}
                                                onChange={(e) => handleFieldChange('adminEmail', e.target.value)}
                                                onBlur={() => handleFieldBlur('adminEmail')}
                                                error={!!formErrors.adminEmail}
                                                helperText={touchedFields.adminEmail ? formErrors.adminEmail : ''}
                                                required
                                                variant="outlined"
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>

                                <DialogActions sx={{ px: 0, pt: 3 }}>
                                    <Button
                                        onClick={handleCloseModal}
                                        variant="outlined"
                                        sx={{ textTransform: 'none' }}
                                        disabled={isCreatingSchool}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        component={motion.button}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        sx={{ fontWeight: 600 }}
                                        disabled={isCreatingSchool}
                                    >
                                        {isCreatingSchool ? 'Creating...' : 'Create School'}
                                    </Button>
                                </DialogActions>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}

                {createdSchool && (
                    <Dialog 
                        open={!!createdSchool} 
                        onClose={handleCloseSuccess}
                        maxWidth="sm"
                        fullWidth
                        PaperProps={{
                            component: motion.div,
                            initial: { opacity: 0, scale: 0.8 },
                            animate: { opacity: 1, scale: 1 },
                        }}
                    >
                        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            >
                                <Box
                                    sx={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: '50%',
                                        backgroundColor: 'success.main',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 16px',
                                    }}
                                >
                                    <CheckCircle sx={{ fontSize: 40, color: 'white' }} />
                                </Box>
                            </motion.div>
                            
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                                School Created Successfully!
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                The school has been set up with an admin account
                            </Typography>

                            <Card 
                                sx={{ 
                                    backgroundColor: 'primary.50',
                                    p: 3,
                                    mb: 3,
                                    textAlign: 'left',
                                }}
                            >
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>School:</strong> {createdSchool.school.name}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Subdomain:</strong> {createdSchool.school.subdomain}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 2 }}>
                                    <strong>URL:</strong> {createdSchool.school.url}
                                </Typography>
                                
                                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2, mt: 2 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
                                        Admin Credentials:
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        <strong>Email:</strong> {createdSchool.admin.email}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 2 }}>
                                        <strong>Temp Password:</strong> 
                                        <Box component="code" sx={{ 
                                            backgroundColor: 'warning.light',
                                            px: 1.5,
                                            py: 0.5,
                                            borderRadius: 1,
                                            ml: 1,
                                            fontFamily: 'monospace',
                                            fontSize: '0.9em'
                                        }}>
                                            {createdSchool.admin.tempPassword}
                                        </Box>
                                    </Typography>
                                </Box>
                                
                                <Box 
                                    sx={{ 
                                        backgroundColor: 'warning.light',
                                        p: 2,
                                        borderRadius: 2,
                                        mt: 2,
                                    }}
                                >
                                    <Typography variant="body2">
                                        ⚠️ Please save these credentials securely. The password must be changed on first login.
                                    </Typography>
                                </Box>
                            </Card>

                            <Button
                                onClick={handleCloseSuccess}
                                variant="contained"
                                fullWidth
                                sx={{ py: 1.5, fontWeight: 600, mt: 2 }}
                            >
                                Close
                            </Button>
                        </DialogContent>
                    </Dialog>
                )}

            </Box>
            {/* Global info dialog */}
            <InfoDialog
                open={infoDialog.open}
                title={infoDialog.title}
                message={infoDialog.message}
                onClose={() => setInfoDialog({ open: false, title: '', message: '' })}
            />
        </Layout>
    );
};

export default Schools;
