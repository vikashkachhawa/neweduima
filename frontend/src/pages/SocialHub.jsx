import React from 'react';
import { Box, Typography } from '@mui/material';
import Layout from '../components/Layout';
import SocialNetworkingPanel from '../components/SocialNetworkingPanel';

const SocialHub = () => {
  return (
    <Layout>
      <Box sx={{ maxWidth: 980, mx: 'auto' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
          Connect Hub
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Find people, build connections, and follow school pages from one clean workspace.
        </Typography>
        <SocialNetworkingPanel />
      </Box>
    </Layout>
  );
};

export default SocialHub;
