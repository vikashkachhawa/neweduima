import React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Sidebar from './Sidebar';

const SIDEBAR_WIDTH = 280;

const Layout = ({ children, disablePadding = false }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: disablePadding ? 0 : { xs: 2, sm: 3 },
                    ml: isMobile ? '0' : '10px',
                    width: isMobile ? '100%' : `calc(100% - ${SIDEBAR_WIDTH}px - 10px)`,
                    minHeight: '100vh',
                }}
            >
                {children}
            </Box>
        </Box>
    );
};

export default Layout;
