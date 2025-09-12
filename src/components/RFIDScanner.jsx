import React, { useState, useEffect } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import { db, COLLECTIONS } from '../config/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Box, TextField, Button, Typography, Select, MenuItem, FormControl, InputLabel, Alert } from '@mui/material';

export const RFIDScanner = () => {
  const [rfidInput, setRfidInput] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [isCheckout, setIsCheckout] = useState(false);
  const [exams, setExams] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const { recordAttendance, loading, error } = useDatabase();

  useEffect(() => {
    // Fetch active exams
    const examQuery = query(collection(db, COLLECTIONS.EXAMS), where('status', '==', 'active'));
    const unsubscribeExams = onSnapshot(examQuery, (snapshot) => {
      setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch active devices
    const deviceQuery = query(collection(db, COLLECTIONS.DEVICES), where('status', '==', 'active'));
    const unsubscribeDevices = onSnapshot(deviceQuery, (snapshot) => {
      setDevices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Focus input
    const input = document.getElementById('rfid-input');
    if (input) input.focus();

    return () => {
      unsubscribeExams();
      unsubscribeDevices();
    };
  }, []);

  const handleRFIDScan = async () => {
    if (!selectedExam || !selectedDevice) {
      setScanMessage('Please select an exam and device');
      return;
    }
    try {
      await recordAttendance({
        examId: selectedExam,
        deviceId: selectedDevice,
        rfidTag: rfidInput,
        isCheckout
      });
      setScanMessage(`Successfully recorded ${isCheckout ? 'check-out' : 'check-in'} for RFID: ${rfidInput}`);
      setRfidInput('');
    } catch (err) {
      setScanMessage(`Error: ${err.message}`);
    }
  };

  return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4">RFID Scanner</Typography>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Exam</InputLabel>
          <Select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)}>
            {exams.map(exam => (
                <MenuItem key={exam.id} value={exam.id}>{exam.examName}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Device</InputLabel>
          <Select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}>
            {devices.map(device => (
                <MenuItem key={device.id} value={device.id}>{device.deviceName}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ mt: 2 }}>
          <Button
              variant="contained"
              onClick={() => setIsCheckout(false)}
              color={isCheckout ? 'inherit' : 'primary'}
          >
            Check-In
          </Button>
          <Button
              variant="contained"
              onClick={() => setIsCheckout(true)}
              color={isCheckout ? 'primary' : 'inherit'}
              sx={{ ml: 1 }}
          >
            Check-Out
          </Button>
        </Box>
        <TextField
            id="rfid-input"
            label="Scan RFID Card"
            value={rfidInput}
            onChange={(e) => setRfidInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleRFIDScan();
                e.preventDefault();
              }
            }}
            fullWidth
            sx={{ mt: 2 }}
            autoFocus
        />
        {loading && <Typography sx={{ mt: 2 }}>Processing...</Typography>}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {scanMessage && <Alert severity={error ? 'error' : 'success'} sx={{ mt: 2 }}>{scanMessage}</Alert>}
      </Box>
  );
};