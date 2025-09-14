import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { useDatabase } from '../hooks/useDatabase';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Switch,
    Button,
    Alert,
    Grid,
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

const Settings = () => {
    const [examSettings, setExamSettings] = useState(null);
    const [emailSettings, setEmailSettings] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const { updateDocument } = useDatabase();

    useEffect(() => {
        // Fetch examSettings
        const examSettingsRef = doc(db, COLLECTIONS.SETTINGS, 'examSettings');
        const unsubscribeExamSettings = onSnapshot(examSettingsRef, (doc) => {
            if (doc.exists()) {
                setExamSettings(doc.data());
            }
        });

        // Fetch emailSettings
        const emailSettingsRef = doc(db, COLLECTIONS.SETTINGS, 'emailSettings');
        const unsubscribeEmailSettings = onSnapshot(emailSettingsRef, (doc) => {
            if (doc.exists()) {
                setEmailSettings(doc.data());
            }
        });

        return () => {
            unsubscribeExamSettings();
            unsubscribeEmailSettings();
        };
    }, []);

    const examSettingsSchema = Yup.object({
        allowLateEntry: Yup.boolean().required('Required'),
        lateEntryGracePeriod: Yup.number().min(0, 'Must be non-negative').required('Required'),
        autoCheckOut: Yup.boolean().required('Required'),
        checkOutGracePeriod: Yup.number().min(0, 'Must be non-negative').required('Required'),
    });

    const emailSettingsSchema = Yup.object({
        enableCheckoutEmail: Yup.boolean().required('Required'),
        emailTemplate: Yup.string().required('Required'),
        smtpServer: Yup.string().required('Required'),
        smtpPort: Yup.number().min(1, 'Must be a valid port').required('Required'),
        senderEmail: Yup.string().email('Invalid email').required('Required'),
    });

    const handleExamSettingsSubmit = async (values) => {
        try {
            await updateDocument(COLLECTIONS.SETTINGS, 'examSettings', values);
            setSuccess('Exam settings updated successfully!');
            setError(null);
        } catch (err) {
            setError(err.message);
            setSuccess(null);
        }
    };

    const handleEmailSettingsSubmit = async (values) => {
        try {
            await updateDocument(COLLECTIONS.SETTINGS, 'emailSettings', values);
            setSuccess('Email settings updated successfully!');
            setError(null);
        } catch (err) {
            setError(err.message);
            setSuccess(null);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>Settings</Typography>
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h5" gutterBottom>Exam Settings</Typography>
                        {examSettings ? (
                            <Formik
                                initialValues={examSettings}
                                validationSchema={examSettingsSchema}
                                onSubmit={handleExamSettingsSubmit}
                                enableReinitialize
                            >
                                {({ errors, touched, values }) => (
                                    <Form>
                                        <Field
                                            as={Switch}
                                            name="allowLateEntry"
                                            checked={values.allowLateEntry}
                                            label="Allow Late Entry"
                                        />
                                        <Field
                                            as={TextField}
                                            name="lateEntryGracePeriod"
                                            label="Late Entry Grace Period (minutes)"
                                            type="number"
                                            fullWidth
                                            margin="normal"
                                            error={touched.lateEntryGracePeriod && !!errors.lateEntryGracePeriod}
                                            helperText={touched.lateEntryGracePeriod && errors.lateEntryGracePeriod}
                                        />
                                        <Field
                                            as={Switch}
                                            name="autoCheckOut"
                                            checked={values.autoCheckOut}
                                            label="Auto Check-Out"
                                        />
                                        <Field
                                            as={TextField}
                                            name="checkOutGracePeriod"
                                            label="Check-Out Grace Period (minutes)"
                                            type="number"
                                            fullWidth
                                            margin="normal"
                                            error={touched.checkOutGracePeriod && !!errors.checkOutGracePeriod}
                                            helperText={touched.checkOutGracePeriod && errors.checkOutGracePeriod}
                                        />
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            sx={{ mt: 2 }}
                                        >
                                            Save Exam Settings
                                        </Button>
                                    </Form>
                                )}
                            </Formik>
                        ) : (
                            <Typography>Loading...</Typography>
                        )}
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h5" gutterBottom>Email Settings</Typography>
                        {emailSettings ? (
                            <Formik
                                initialValues={emailSettings}
                                validationSchema={emailSettingsSchema}
                                onSubmit={handleEmailSettingsSubmit}
                                enableReinitialize
                            >
                                {({ errors, touched, values }) => (
                                    <Form>
                                        <Field
                                            as={Switch}
                                            name="enableCheckoutEmail"
                                            checked={values.enableCheckoutEmail}
                                            label="Enable Checkout Email"
                                        />
                                        <Field
                                            as={TextField}
                                            name="emailTemplate"
                                            label="Email Template"
                                            multiline
                                            rows={4}
                                            fullWidth
                                            margin="normal"
                                            error={touched.emailTemplate && !!errors.emailTemplate}
                                            helperText={touched.emailTemplate && errors.emailTemplate}
                                        />
                                        <Field
                                            as={TextField}
                                            name="smtpServer"
                                            label="SMTP Server"
                                            fullWidth
                                            margin="normal"
                                            error={touched.smtpServer && !!errors.smtpServer}
                                            helperText={touched.smtpServer && errors.smtpServer}
                                        />
                                        <Field
                                            as={TextField}
                                            name="smtpPort"
                                            label="SMTP Port"
                                            type="number"
                                            fullWidth
                                            margin="normal"
                                            error={touched.smtpPort && !!errors.smtpPort}
                                            helperText={touched.smtpPort && errors.smtpPort}
                                        />
                                        <Field
                                            as={TextField}
                                            name="senderEmail"
                                            label="Sender Email"
                                            fullWidth
                                            margin="normal"
                                            error={touched.senderEmail && !!errors.senderEmail}
                                            helperText={touched.senderEmail && errors.senderEmail}
                                        />
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            sx={{ mt: 2 }}
                                        >
                                            Save Email Settings
                                        </Button>
                                    </Form>
                                )}
                            </Formik>
                        ) : (
                            <Typography>Loading...</Typography>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Settings;