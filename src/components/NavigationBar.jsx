import React, {useState} from 'react';
import {
    AppBar,
    Toolbar,
    Button,
    Typography,
    Menu,
    MenuItem,
    Avatar,
    Box,
    Divider,
    ListItemIcon,
    Alert,
    Snackbar
} from '@mui/material';
import {
    Person,
    ExitToApp,
    Dashboard,
    School,
    People,
    Computer,
    Assignment,
    ResetTv,
} from '@mui/icons-material';
import {Link, useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {Role} from "../models/types";

const NavigationBar = () => {
    const {user, logout, isAdmin, error} = useAuth();
    const [anchorEl, setAnchorEl] = useState(null);
    const [logoutError, setLogoutError] = useState('');
    const navigate = useNavigate();

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        try {
            setLogoutError('');
            handleMenuClose();
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            setLogoutError('Failed to logout. Please try again.');
        }
    };

    const handleCloseError = () => {
        setLogoutError('');
    };

    const adminMenuItems = [
        {label: 'Attendance', path: '/attendance', icon: <ResetTv/>},
        {label: 'Exams', path: '/exams', icon: <Assignment/>},
        {label: 'Devices', path: '/devices', icon: <Computer/>},
        {label: 'Courses', path: '/courses', icon: <School/>},
        {label: 'Students', path: '/students', icon: <People/>},
        {label: 'Lecturers', path: '/lecturers', icon: <People/>}
    ];

    const lecturerMenuItems = [
        {label: 'Dashboard', path: '/', icon: <Dashboard/>},
        {label: 'Attendance', path: '/attendance', icon: <Assignment/>}
    ];

    const menuItems = isAdmin ? adminMenuItems : lecturerMenuItems;

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Button
                        color="inherit"
                        component={Link}
                        to={'/'}
                        sx={{flexGrow: 1}}
                    >
                        <Typography variant="h6" component="div">
                            Attendance System
                        </Typography>
                    </Button>

                    {user ? (
                        <>
                            {/* Navigation Links */}
                            <Box sx={{display: {xs: 'none', md: 'flex'}, mr: 2}}>
                                {menuItems.map((item) => (
                                    <Button
                                        key={item.path}
                                        color="inherit"
                                        component={Link}
                                        to={item.path}
                                        startIcon={item.icon}
                                        sx={{mx: 1}}
                                    >
                                        {item.label}
                                    </Button>
                                ))}
                            </Box>

                            {/* User Menu */}
                            <Box sx={{display: 'flex', alignItems: 'center'}}>
                                <Typography variant="body2" sx={{mr: 2}}>
                                    {user.displayName || user.name || 'User'}
                                    {isAdmin && (
                                        <Typography
                                            component="span"
                                            variant="caption"
                                            sx={{
                                                ml: 1,
                                                px: 1,
                                                py: 0.5,
                                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                borderRadius: 1
                                            }}
                                        >
                                            Admin
                                        </Typography>
                                    )}
                                </Typography>

                                <Button
                                    color="inherit"
                                    onClick={handleMenuOpen}
                                    startIcon={
                                        <Avatar
                                            sx={{width: 24, height: 24}}
                                            src={user.photoURL}
                                        >
                                            {(user.displayName || user.name || user.email)?.[0]?.toUpperCase()}
                                        </Avatar>
                                    }
                                >
                                    Menu
                                </Button>

                                <Menu
                                    anchorEl={anchorEl}
                                    open={Boolean(anchorEl)}
                                    onClose={handleMenuClose}
                                    transformOrigin={{horizontal: 'right', vertical: 'top'}}
                                    anchorOrigin={{horizontal: 'right', vertical: 'bottom'}}
                                >
                                    {/* Mobile Navigation */}
                                    <Box sx={{display: {xs: 'block', md: 'none'}}}>
                                        {menuItems.map((item) => (
                                            <MenuItem
                                                key={item.path}
                                                component={Link}
                                                to={item.path}
                                                onClick={handleMenuClose}
                                            >
                                                <ListItemIcon>{item.icon}</ListItemIcon>
                                                {item.label}
                                            </MenuItem>
                                        ))}
                                        <Divider/>
                                    </Box>

                                    {/* Profile and Logout */}
                                    {user.role === Role.ADMIN && (
                                        <div>
                                            <MenuItem component={Link} to="/users" onClick={handleMenuClose}>
                                                <ListItemIcon>
                                                    <People/>
                                                </ListItemIcon>
                                                Users Management
                                            </MenuItem>
                                        </div>
                                    )}
                                    <Divider/>
                                    <MenuItem component={Link} to="/profile" onClick={handleMenuClose}>
                                        <ListItemIcon>
                                            <Person/>
                                        </ListItemIcon>
                                        Profile
                                    </MenuItem>
                                    <MenuItem onClick={handleLogout}>
                                        <ListItemIcon>
                                            <ExitToApp/>
                                        </ListItemIcon>
                                        Logout
                                    </MenuItem>
                                </Menu>
                            </Box>
                        </>
                    ) : (
                        <Box>
                            <Button color="inherit" component={Link} to="/login">
                                Login
                            </Button>
                            <Button color="inherit" component={Link} to="/signup">
                                Sign Up
                            </Button>
                        </Box>
                    )}
                </Toolbar>
            </AppBar>

            {/* Error Snackbar */}
            <Snackbar
                open={!!error || !!logoutError}
                autoHideDuration={6000}
                onClose={handleCloseError}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
            >
                <Alert
                    onClose={handleCloseError}
                    severity="error"
                    sx={{width: '100%'}}
                >
                    {error || logoutError}
                </Alert>
            </Snackbar>
        </>
    );
};

export default NavigationBar;