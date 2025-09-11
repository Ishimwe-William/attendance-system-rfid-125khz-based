import { useState, useCallback } from 'react';
import { db, COLLECTIONS } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp, getDoc
} from 'firebase/firestore';
import { AttendanceStatus } from '../models/types';

export const useDatabase = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const addDocument = async (collectionName, data) => {
    try {
      setLoading(true);
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateDocument = async (collectionName, docId, data) => {
    try {
      setLoading(true);
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedBy: user.uid,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (collectionName, docId) => {
    try {
      setLoading(true);
      await deleteDoc(doc(db, collectionName, docId));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const recordAttendance = async ({ examId, deviceId, rfidTag, isCheckout = false }) => {
    try {
      setLoading(true);
      // Fetch student by rfidTag
      const studentQuery = query(collection(db, COLLECTIONS.STUDENTS), where('rfidTag', '==', rfidTag));
      const studentSnap = await getDocs(studentQuery);
      if (studentSnap.empty) throw new Error('No student found with this RFID tag');

      const student = studentSnap.docs[0].data();
      const studentId = studentSnap.docs[0].id;

      // Fetch exam
      const examRef = doc(db, COLLECTIONS.EXAMS, examId);
      const examSnap = await getDoc(examRef);
      if (!examSnap.exists()) throw new Error('Exam not found');
      const exam = examSnap.data();

      // Fetch settings
      const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'global');
      const settingsSnap = await getDoc(settingsRef);
      const settings = settingsSnap.exists() ? settingsSnap.data() : {};
      const examSettings = settings.examSettings || {};

      // Validate enrollment
      const courseRef = doc(db, COLLECTIONS.COURSES, exam.courseId);
      const courseSnap = await getDoc(courseRef);
      if (!courseSnap.exists()) throw new Error('Course not found');
      const course = courseSnap.data();
      if (!course.students.includes(studentId)) throw new Error('Student not enrolled in course');

      // Check exam status and timing
      if (exam.status !== 'active') throw new Error('Exam is not active');
      const now = new Date();
      const examDateTime = new Date(`${exam.examDate}T${exam.startTime}:00Z`);
      const lateThreshold = new Date(examDateTime.getTime() + (examSettings.lateEntryGracePeriod || 0) * 60 * 1000);

      // Find or create attendance record
      const attendanceQuery = query(
          collection(db, COLLECTIONS.ATTENDANCE),
          where('examId', '==', examId),
          where('studentId', '==', studentId)
      );
      const attendanceSnap = await getDocs(attendanceQuery);

      if (isCheckout) {
        if (attendanceSnap.empty) throw new Error('No check-in record found');
        const attendanceId = attendanceSnap.docs[0].id;
        await updateDoc(doc(db, COLLECTIONS.ATTENDANCE, attendanceId), {
          checkOutTime: now.toISOString(),
          emailSent: false,
          updatedBy: user.uid,
          updatedAt: serverTimestamp()
        });
      } else {
        if (!attendanceSnap.empty) throw new Error('Student already checked in');
        const status = examSettings.allowLateEntry && now <= lateThreshold ? AttendanceStatus.PRESENT : AttendanceStatus.LATE;
        await addDoc(collection(db, COLLECTIONS.ATTENDANCE), {
          examId,
          studentId,
          rfidTag,
          deviceId,
          checkInTime: now.toISOString(),
          status: examSettings.allowLateEntry ? status : AttendanceStatus.PRESENT,
          emailSent: false,
          createdBy: user.uid,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    addDocument,
    updateDocument,
    deleteDocument,
    recordAttendance
  };
};