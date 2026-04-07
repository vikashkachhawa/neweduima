import React from 'react';
import { Box, Paper, Typography, Button, Container } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorStack: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorStack: error.stack
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorStack: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md">
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4
            }}
          >
            <Paper
              sx={{
                p: { xs: 2, sm: 3, md: 4 },
                width: '100%',
                backgroundColor: '#fee2e2',
                border: '2px solid #dc2626',
                borderRadius: '12px'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <ErrorIcon sx={{ fontSize: '3rem', color: '#dc2626' }} />
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    color: '#7f1d1d',
                    fontSize: { xs: '1.5rem', sm: '2rem' }
                  }}
                >
                  Oops! Something Went Wrong
                </Typography>
              </Box>

              <Typography
                variant="body1"
                sx={{
                  color: '#991b1b',
                  mb: 3,
                  fontSize: { xs: '0.9rem', sm: '1rem' }
                }}
              >
                The school page encountered an error and couldn't load. Here are the details:
              </Typography>

              {/* Error Message */}
              {this.state.error && (
                <Paper
                  sx={{
                    p: 2,
                    mb: 3,
                    backgroundColor: '#fecaca',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    overflow: 'auto',
                    maxHeight: '200px'
                  }}
                >
                  <Typography
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: { xs: '0.75rem', sm: '0.85rem' },
                      color: '#7f1d1d',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    <strong>Error:</strong> {this.state.error.toString()}
                  </Typography>
                </Paper>
              )}

              {/* Stack Trace */}
              {this.state.errorStack && (
                <Paper
                  sx={{
                    p: 2,
                    mb: 3,
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    overflow: 'auto',
                    maxHeight: '300px'
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: '#991b1b',
                      mb: 1
                    }}
                  >
                    Stack Trace:
                  </Typography>
                  <Typography
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: { xs: '0.7rem', sm: '0.8rem' },
                      color: '#7f1d1d',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {this.state.errorStack}
                  </Typography>
                </Paper>
              )}

              {/* Component Stack */}
              {this.state.errorInfo?.componentStack && (
                <Paper
                  sx={{
                    p: 2,
                    mb: 3,
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    overflow: 'auto',
                    maxHeight: '250px'
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: '#991b1b',
                      mb: 1
                    }}
                  >
                    Component Stack:
                  </Typography>
                  <Typography
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: { xs: '0.7rem', sm: '0.8rem' },
                      color: '#7f1d1d',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {this.state.errorInfo.componentStack}
                  </Typography>
                </Paper>
              )}

              {/* Action Buttons */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  flexDirection: { xs: 'column', sm: 'row' }
                }}
              >
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.resetError}
                  sx={{
                    backgroundColor: '#dc2626',
                    '&:hover': { backgroundColor: '#b91c1c' },
                    flex: 1
                  }}
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => window.location.href = '/'}
                  sx={{
                    borderColor: '#dc2626',
                    color: '#7f1d1d',
                    '&:hover': {
                      borderColor: '#991b1b',
                      backgroundColor: 'rgba(220, 38, 38, 0.05)'
                    },
                    flex: 1
                  }}
                >
                  Go Home
                </Button>
              </Box>

              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 3,
                  color: '#991b1b',
                  textAlign: 'center'
                }}
              >
                💡 <strong>Tip:</strong> Check the browser console (F12) for more details, or contact support if the problem persists.
              </Typography>
            </Paper>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
