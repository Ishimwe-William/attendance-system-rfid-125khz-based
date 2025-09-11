import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  IconButton,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  Class as ClassIcon,
  Person as PersonIcon,
  Event as EventIcon,
  Devices as DevicesIcon,
  Settings as SettingsIcon,
  Scanner as ScannerIcon,
  PersonAdd as PersonAddIcon,
  List as ListIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

export const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  const menuItems = [
    { text: 'Dashboard', path: '/', icon: <DashboardIcon />, roles: ['admin', 'lecturer'] },
    { text: 'Sign Up', path: '/signup', icon: <PersonAddIcon />, roles: ['admin'] },
    { text: 'Students', path: '/students', icon: <SchoolIcon />, roles: ['admin'] },
    { text: 'Courses', path: '/courses', icon: <ClassIcon />, roles: ['admin'] },
    { text: 'Lecturers', path: '/lecturers', icon: <PersonIcon />, roles: ['admin'] },
    { text: 'Exams', path: '/exams', icon: <EventIcon />, roles: ['admin'] },
    { text: 'Devices', path: '/devices', icon: <DevicesIcon />, roles: ['admin'] },
    { text: 'Settings', path: '/settings', icon: <SettingsIcon />, roles: ['admin'] },
    { text: 'Attendance', path: '/attendance', icon: <ListIcon />, roles: ['admin', 'lecturer'] },
    { text: 'Scanner', path: '/scanner', icon: <ScannerIcon />, roles: ['admin', 'lecturer'] },
  ];

  return (
      <>
        <AppBar position="static">
          <Toolbar>
            <IconButton
                color="inherit"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              RFID Attendance
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer anchor="left" open={open} onClose={handleDrawerToggle}>
          <Box sx={{ width: 250, p: 2 }}>
            {user && (
                <>
                  <Typography variant="h6">{user.email}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                </>
            )}
            <List>
              {menuItems.map((item) => (
                  (item.roles.includes(user?.role)) && (
                      <ListItem
                          button
                          key={item.text}
                          component={Link}
                          to={item.path}
                          onClick={handleDrawerToggle}
                      >
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.text} />
                      </ListItem>
                  )
              ))}
              <ListItem button onClick={handleLogout}>
                <ListItemIcon><LogoutIcon /></ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItem>
            </List>
          </Box>
        </Drawer>
      </>
  );
};