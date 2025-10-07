// timeHelpers.js (or paste below your imports)
export const pad = (n) => (n < 10 ? `0${n}` : `${n}`);

export const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Parse a "local" date-time string like "2025-10-06T17:00" (no timezone) as local time
 * If the string already contains timezone info (Z or +hh:mm) we let Date handle it.
 * Returns a JS Date or null.
 */
export const parseLocalDateTime = (s) => {
    if (!s) return null;
    // If the string includes a timezone marker, let Date parse it
    if (/[Z+-]/.test(s)) {
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }
    // Expecting YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
    const [datePart, timePart] = s.split('T');
    if (!datePart || !timePart) return null;
    const [y, m, d] = datePart.split('-').map(Number);
    const timeSegs = timePart.split(':').map(Number);
    const hh = timeSegs[0] || 0;
    const mm = timeSegs[1] || 0;
    const ss = timeSegs[2] || 0;
    const dt = new Date(y, m - 1, d, hh, mm, ss);
    return isNaN(dt.getTime()) ? null : dt;
};

/**
 * Return a JavaScript Date or null for check-in.
 * Preference order:
 *  1) checkInEpochTime (UTC epoch seconds) -> new Date(epoch*1000)
 *  2) checkInTime string parsed as local time (no added offsets)
 */
export const getCheckInDate = (row) => {
    if (!row) return null;

    if (row?.checkInEpochTime) {
        return new Date(Number(row.checkInEpochTime) * 1000);
    }

    if (row?.checkInTime) {
        return parseLocalDateTime(row.checkInTime);
    }

    return null;
};

/**
 * Return a JavaScript Date or null for check-out.
 * Same preference as check-in.
 */
export const getCheckOutDate = (row) => {
    if (!row) return null;

    if (row?.checkOutEpochTime) {
        return new Date(Number(row.checkOutEpochTime) * 1000);
    }

    if (row?.checkOutTime) {
        return parseLocalDateTime(row.checkOutTime);
    }

    return null;
};

export const addHours = (date, hours = 2) => {
    if (!date) return null;
    const d = new Date(date.getTime());
    d.setHours(d.getHours() + hours);
    return d;
};
