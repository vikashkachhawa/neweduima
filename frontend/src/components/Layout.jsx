import React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Sidebar from './Sidebar';

const SIDEBAR_WIDTH = 280;

const Layout = ({ children, disablePadding = false, hideSidebar = false }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Box sx={{ display: 'flex', height: hideSidebar ? '100dvh' : 'auto', minHeight: '100dvh', width: '100%', overflow: hideSidebar ? 'hidden' : 'visible' }}>
            {!hideSidebar && <Sidebar />}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: disablePadding ? 0 : { xs: 2, sm: 3 },
                    ml: isMobile || hideSidebar ? '0' : '10px',
                    width: isMobile || hideSidebar ? '100%' : `calc(100% - ${SIDEBAR_WIDTH}px - 10px)`,
                    height: hideSidebar ? '100dvh' : 'auto',
                    minHeight: hideSidebar ? '100dvh' : '100vh',
                    overflow: hideSidebar ? 'hidden' : 'visible',
                }}
            >
                {children}
            </Box>
        </Box>
    );
};

export default Layout;
