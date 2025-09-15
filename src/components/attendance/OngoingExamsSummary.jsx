import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

const OngoingExamsSummary = ({ exams, courses, attendance, getExamStatus, getStatusColor, getAttendanceStatus, AttendanceStatus }) => {
    const getOngoingExams = () => {
        return exams.filter(exam => {
            const status = getExamStatus(exam);
            return status === 'in-progress' || status === 'active';
        });
    };

    return (
        getOngoingExams().length > 0 && (
            <Box sx={{ mb: 3, p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>Ongoing Exams</Typography>
                {getOngoingExams().map(exam => {
                    const course = courses.find(c => c.id === exam.courseCode);
                    const attendanceCount = attendance.filter(a => {
                        if (a.currentExam !== exam.id && a.examId !== exam.id) return false;
                        const status = getAttendanceStatus(exam, a);
                        return status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE;
                    }).length;
                    return (
                        <Box key={exam.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Chip label={getExamStatus(exam)} color={getStatusColor(getExamStatus(exam))} size="small" />
                            <Typography variant="body2">
                                <strong>{course?.courseName || 'Unknown Course'}</strong> -
                                {exam.examType} | Room {exam.room} |
                                {exam.startTime} - {exam.endTime || 'TBD'} |
                                Present: {attendanceCount}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>
        )
    );
};

export default OngoingExamsSummary;