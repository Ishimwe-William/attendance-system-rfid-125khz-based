import React, {useState} from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Collapse from '@mui/material/Collapse';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {Button} from "@mui/material";

const AttendanceTable = ({
                             attendance,
                             exams,
                             handleDelete,
                             handleEdit,
                             courses,
                             students,
                             devices,
                             getCheckInDate,
                             getCheckOutDate,
                             getAttendanceStatus,
                             getExamStatus,
                             getStatusColor,
                         }) => {
    const [expandedRows, setExpandedRows] = useState({});

    const handleExpandRow = (rowId) => {
        setExpandedRows((prevExpandedRows) => ({
            ...prevExpandedRows,
            [rowId]: !prevExpandedRows[rowId],
        }));
    };

    return (
        <TableContainer component={Paper}>
            <Table aria-label="attendance table">
                <TableHead>
                    <TableRow>
                        <TableCell/>
                        <TableCell>Exam ID</TableCell>
                        <TableCell>Course</TableCell>
                        <TableCell>Student</TableCell>
                        <TableCell>Attendance Status</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {attendance.map((row) => {
                        const examId = row?.currentExam || row?.examId;
                        const exam = exams.find((e) => e.id === examId);
                        const course = courses.find((c) => c.id === exam?.courseCode);
                        const student = students.find((s) => s.id === row?.studentId);
                        const status = getAttendanceStatus(exam, row);
                        const color = getStatusColor(status);

                        return (
                            <React.Fragment key={row.id}>
                                <TableRow>
                                    <TableCell>
                                        <IconButton
                                            aria-label="expand row"
                                            size="small"
                                            onClick={() => handleExpandRow(row.id)}
                                        >
                                            {expandedRows[row.id] ? (
                                                <KeyboardArrowUpIcon/>
                                            ) : (
                                                <KeyboardArrowDownIcon/>
                                            )}
                                        </IconButton>
                                    </TableCell>
                                    <TableCell>{examId}</TableCell>
                                    <TableCell>{course?.courseName}</TableCell>
                                    <TableCell>{student?.name || (students.find((e) => e.rfidTag === row.studentId)?.name)}</TableCell>                                    <TableCell>
                                        <Chip label={status} color={color} size="small" variant="outlined"/>
                                    </TableCell>
                                    <TableCell align="left">
                                        {!row?.rfidTag ? (
                                            <Typography color="textSecondary" variant="caption">
                                                Device Recorded
                                            </Typography>
                                        ) : (
                                            <Box sx={{display: 'flex', gap: 1, justifyContent: 'flex-start'}}>
                                                <Button size="small" variant="outlined" onClick={() => handleEdit(row)}>
                                                    Edit
                                                </Button>
                                                <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(row)}>
                                                    Delete
                                                </Button>
                                            </Box>
                                        )}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell style={{paddingBottom: 0, paddingTop: 0}} colSpan={6}>
                                        <Collapse in={expandedRows[row.id]} timeout="auto" unmountOnExit>
                                            <Box sx={{margin: 1}}>
                                                <Typography variant="h6" gutterBottom component="div">
                                                    Attendance Details
                                                </Typography>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="body2">
                                                            <strong>Exam Information</strong>
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            <strong>Exam Type:</strong> {exam?.examType || "N/A"}
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            <strong>Exam Date:</strong> {exam?.examDate || "N/A"}
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            <strong>Exam Time:</strong>{" "}
                                                            {exam
                                                                ? `${exam.startTime} - ${
                                                                    exam.endTime ||
                                                                    (() => {
                                                                        const start = new Date(`2000-01-01T${exam.startTime}`);
                                                                        const end = new Date(start.getTime() + exam.duration * 60 * 60 * 1000);
                                                                        return end.toLocaleTimeString("en-GB", {
                                                                            timeZone: 'Africa/Accra',
                                                                            hour: "2-digit",
                                                                            minute: "2-digit",
                                                                            hour12: false,
                                                                        });
                                                                    })()}`
                                                                : "N/A"}
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            <strong>Duration (hrs):</strong> {exam?.duration || "N/A"}
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            <strong>Room:</strong> {exam?.room || row?.examRoom || "N/A"}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="body2">
                                                            <strong>Attendance Information</strong>
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            <strong>Check-In:</strong>{" "}
                                                            {getCheckInDate(row)
                                                                ? getCheckInDate(row).toLocaleString("en-GB", {
                                                                    timeZone: 'Africa/Accra',
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                    second: "2-digit",
                                                                    hour12: false,
                                                                })
                                                                : "Not checked in"}
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            <strong>Check-Out:</strong>{" "}
                                                            {getCheckOutDate(row)
                                                                ? getCheckOutDate(row).toLocaleString("en-GB", {
                                                                    timeZone: 'Africa/Accra',
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                    second: "2-digit",
                                                                    hour12: false,
                                                                })
                                                                : "Not checked out"}
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            <strong>Attendance Status:</strong>{" "}
                                                            <Chip
                                                                label={getAttendanceStatus(exam, row)}
                                                                color={getStatusColor(getAttendanceStatus(exam, row))}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12}>
                                                        <Typography variant="body2">
                                                            <strong>Additional Information</strong>
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            <strong>RFID
                                                                Tag:</strong> {row?.rfidTag || row?.studentId || "N/A"}
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            <strong>Device:</strong>{" "}
                                                            {devices.find((d) => d.id === row?.deviceId)?.deviceName ||
                                                                row?.deviceName ||
                                                                row?.deviceId ||
                                                                "N/A"}
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            <strong>Email Sent:</strong> {row?.emailSent ? "Yes" : "No"}
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            <strong>Exam Status:</strong>{" "}
                                                            <Chip
                                                                label={getExamStatus(exam)}
                                                                color={getStatusColor(getExamStatus(exam))}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        </Typography>
                                                    </Grid>
                                                </Grid>
                                            </Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default AttendanceTable;