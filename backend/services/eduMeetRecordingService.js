import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';

const RECORDINGS_DIR = path.resolve(process.cwd(), 'uploads', 'edumeet-recordings');

const extensionForMime = (mimeType) => {
  if (mimeType === 'video/mp4') return 'mp4';
  if (mimeType === 'video/webm') return 'webm';
  return 'webm';
};

const toResponse = (row) => ({
  ...row,
  expires_in_hours: Math.max(0, Math.round((new Date(row.expires_at).getTime() - Date.now()) / 3_600_000)),
});

export const getRecordingAbsolutePath = (fileName) => path.join(RECORDINGS_DIR, fileName);

export const ensureRecordingsDirectory = async () => {
  await fs.mkdir(RECORDINGS_DIR, { recursive: true });
};

export const getRecordingById = async (recordingId) => {
  const [[row]] = await db.query(
    `SELECT r.*, u.first_name AS uploader_first_name, u.last_name AS uploader_last_name
     FROM edumeet_recordings r
     JOIN users u ON u.id = r.uploader_id
     WHERE r.id = ?
     LIMIT 1`,
    [recordingId]
  );
  return row ? toResponse(row) : null;
};

export const listRoomRecordings = async (roomId) => {
  const [rows] = await db.query(
    `SELECT r.*, u.first_name AS uploader_first_name, u.last_name AS uploader_last_name
     FROM edumeet_recordings r
     JOIN users u ON u.id = r.uploader_id
     WHERE r.room_id = ? AND r.expires_at > NOW()
     ORDER BY r.created_at DESC`,
    [roomId]
  );
  return rows.map(toResponse);
};

export const saveRoomRecording = async ({ roomId, uploaderId, title, mimeType, durationSeconds, buffer }) => {
  await ensureRecordingsDirectory();
  const fileExt = extensionForMime(mimeType);
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = path.join(RECORDINGS_DIR, fileName);
  await fs.writeFile(filePath, buffer);

  const fileUrl = `/uploads/edumeet-recordings/${fileName}`;
  const [result] = await db.query(
    `INSERT INTO edumeet_recordings (
      room_id, uploader_id, title, file_name, file_url, mime_type, file_size_bytes, duration_seconds, expires_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
    [roomId, uploaderId, title, fileName, fileUrl, mimeType, buffer.length, durationSeconds || null]
  );

  const [[row]] = await db.query(
    `SELECT r.*, u.first_name AS uploader_first_name, u.last_name AS uploader_last_name
     FROM edumeet_recordings r
     JOIN users u ON u.id = r.uploader_id
     WHERE r.id = ? LIMIT 1`,
    [result.insertId]
  );
  return row ? toResponse(row) : null;
};

export const cleanupExpiredEduMeetRecordings = async () => {
  await ensureRecordingsDirectory();
  const [rows] = await db.query('SELECT id, file_name FROM edumeet_recordings WHERE expires_at <= NOW()');
  if (!rows.length) return 0;

  await Promise.all(rows.map(async (row) => {
    try {
      await fs.unlink(path.join(RECORDINGS_DIR, row.file_name));
    } catch {
      // best effort cleanup
    }
  }));

  await db.query('DELETE FROM edumeet_recordings WHERE expires_at <= NOW()');
  return rows.length;
};
