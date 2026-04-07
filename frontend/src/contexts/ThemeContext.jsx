import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme || 'light';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const muiTheme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: theme,
                    primary: {
                        main: '#0ea5e9',
                        light: '#38bdf8',
                        dark: '#0284c7',
                    },
                    secondary: {
                        main: '#8b5cf6',
                        light: '#a78bfa',
                        dark: '#7c3aed',
                    },
                    success: {
                        main: '#10b981',
                        light: '#34d399',
                        dark: '#059669',
                    },
                    error: {
                        main: '#ef4444',
                        light: '#f87171',
                        dark: '#dc2626',
                    },
                    background: {
                        default: theme === 'dark' ? '#111827' : '#f9fafb',
                        paper: theme === 'dark' ? '#1f2937' : '#ffffff',
                    },
                    text: {
                        primary: theme === 'dark' ? '#f9fafb' : '#111827',
                        secondary: theme === 'dark' ? '#d1d5db' : '#6b7280',
                    },
                },
                typography: {
                    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
                    h1: { fontWeight: 700 },
                    h2: { fontWeight: 700 },
                    h3: { fontWeight: 600 },
                    h4: { fontWeight: 600 },
                    h5: { fontWeight: 600 },
                    h6: { fontWeight: 600 },
                },
                shape: {
                    borderRadius: 12,
                },
                components: {
                    MuiButton: {
                        styleOverrides: {
                            root: {
                                textTransform: 'none',
                                fontWeight: 500,
                                borderRadius: '8px',
                                padding: '10px 20px',
                            },
                        },
                    },
                    MuiCard: {
                        styleOverrides: {
                            root: {
                                borderRadius: '12px',
                                boxShadow: theme === 'dark' 
                                    ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                                    : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            },
                        },
                    },
                    MuiTextField: {
                        styleOverrides: {
                            root: {
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '8px',
                                },
                            },
                        },
                    },
                    MuiDialog: {
                        styleOverrides: {
                            paper: {
                                borderRadius: '16px',
                            },
                        },
                    },
                },
            }),
        [theme]
    );

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <MuiThemeProvider theme={muiTheme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};
