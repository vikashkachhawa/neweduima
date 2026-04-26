import api from './api';

const eduMeetService = {
  listRooms: async (status = '') => {
    const res = await api.get('/edumeet/rooms', { params: status ? { status } : {} });
    return res.data?.rooms || [];
  },

  getIceConfig: async () => {
    const res = await api.get('/edumeet/ice-config');
    return res.data?.iceServers || [];
  },

  createRoom: async (payload) => {
    const res = await api.post('/edumeet/rooms', payload);
    return res.data;
  },

  getRoom: async (roomId) => {
    const res = await api.get(`/edumeet/rooms/${roomId}`);
    return res.data;
  },

  joinByCode: async (invite_code, room_password = '') => {
    const res = await api.post('/edumeet/join', { invite_code, room_password });
    return res.data;
  },

  joinRoom: async (roomId, room_password = '') => {
    const res = await api.post(`/edumeet/rooms/${roomId}/join`, { room_password });
    return res.data;
  },

  startRoom: async (roomId) => {
    const res = await api.post(`/edumeet/rooms/${roomId}/start`);
    return res.data;
  },

  endRoom: async (roomId, { saveHistory = false } = {}) => {
    const res = await api.post(`/edumeet/rooms/${roomId}/end`, { save_history: Boolean(saveHistory) });
    return res.data;
  },

  clearRoomHistory: async (roomId) => {
    const res = await api.delete(`/edumeet/rooms/${roomId}/history`);
    return res.data;
  },

  getParticipants: async (roomId) => {
    const res = await api.get(`/edumeet/rooms/${roomId}/participants`);
    return res.data?.participants || [];
  },

  getMessages: async (roomId) => {
    const res = await api.get(`/edumeet/rooms/${roomId}/messages`);
    return res.data?.messages || [];
  },

  sendMessage: async (roomId, payload) => {
    const res = await api.post(`/edumeet/rooms/${roomId}/messages`, payload);
    return res.data;
  },

  getPolls: async (roomId) => {
    const res = await api.get(`/edumeet/rooms/${roomId}/polls`);
    return res.data?.polls || [];
  },

  createPoll: async (roomId, payload) => {
    const res = await api.post(`/edumeet/rooms/${roomId}/polls`, payload);
    return res.data;
  },

  respondToPoll: async (pollId, selected_option) => {
    const res = await api.post(`/edumeet/polls/${pollId}/respond`, { selected_option });
    return res.data;
  },

  endPoll: async (pollId) => {
    const res = await api.post(`/edumeet/polls/${pollId}/end`);
    return res.data;
  },

  deletePoll: async (pollId) => {
    const res = await api.delete(`/edumeet/polls/${pollId}`);
    return res.data;
  },

  listFiles: async (roomId) => {
    const res = await api.get(`/edumeet/rooms/${roomId}/files`);
    return res.data?.files || [];
  },

  listRecordings: async (roomId) => {
    const res = await api.get(`/edumeet/rooms/${roomId}/recordings`);
    return res.data?.recordings || [];
  },

  uploadRecording: async (roomId, blob, { title, durationSeconds, mimeType }) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${(import.meta.env.VITE_API_URL || '/api')}/edumeet/rooms/${roomId}/recordings/upload`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': mimeType || blob.type || 'video/webm',
        'X-Recording-Title': title,
        'X-Recording-Duration-Seconds': String(durationSeconds || 0),
      },
      body: blob,
    });

    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data?.message || 'Failed to upload recording');
      error.response = { data, status: res.status };
      throw error;
    }
    return data;
  },

  downloadRecording: async (recordingId, fileName = 'edumeet-recording.webm') => {
    const token = localStorage.getItem('token');
    const base = import.meta.env.VITE_API_URL || '/api';
    const res = await fetch(`${base}/edumeet/recordings/${recordingId}/download`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const error = new Error(data?.message || 'Failed to download recording');
      error.response = { data, status: res.status };
      throw error;
    }

    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  },

  shareFile: async (roomId, payload) => {
    const res = await api.post(`/edumeet/rooms/${roomId}/files`, payload);
    return res.data;
  },

  muteAllParticipants: async (roomId) => {
    const res = await api.post(`/edumeet/rooms/${roomId}/controls/mute-all`);
    return res.data;
  },

  removeParticipant: async (roomId, targetUserId) => {
    const res = await api.post(`/edumeet/rooms/${roomId}/participants/${targetUserId}/remove`);
    return res.data;
  },

  spotlightParticipant: async (roomId, targetUserId) => {
    const res = await api.post(`/edumeet/rooms/${roomId}/participants/${targetUserId}/spotlight`);
    return res.data;
  },

  markAttendance: async (roomId) => {
    const res = await api.post(`/edumeet/rooms/${roomId}/attendance/mark`);
    return res.data;
  },

  getDashboard: async (roomId) => {
    const res = await api.get(`/edumeet/rooms/${roomId}/dashboard`);
    return res.data;
  },

  getWaitingRoom: async (roomId) => {
    const res = await api.get(`/edumeet/rooms/${roomId}/waiting`);
    return res.data?.waiting || [];
  },

  admitParticipant: async (roomId, targetUserId, action = 'admit') => {
    const res = await api.post(`/edumeet/rooms/${roomId}/waiting/${targetUserId}/decide`, { action });
    return res.data;
  },

  listBreakoutRooms: async (roomId) => {
    const res = await api.get(`/edumeet/rooms/${roomId}/breakout`);
    return res.data?.breakoutRooms || [];
  },

  createBreakoutRoom: async (roomId, title) => {
    const res = await api.post(`/edumeet/rooms/${roomId}/breakout`, { title });
    return res.data;
  },

  assignToBreakoutRoom: async (roomId, breakoutRoomId, userIds) => {
    const res = await api.post(`/edumeet/rooms/${roomId}/breakout/assign`, { breakoutRoomId, userIds });
    return res.data;
  },

  closeBreakoutRoom: async (roomId, breakoutRoomId) => {
    const res = await api.post(`/edumeet/rooms/${roomId}/breakout/${breakoutRoomId}/close`);
    return res.data;
  },

  muteParticipant: async (roomId, targetUserId) => {
    const res = await api.post(`/edumeet/rooms/${roomId}/participants/${targetUserId}/mute`);
    return res.data;
  },

  getLiveKitToken: async (roomId) => {
    const res = await api.get(`/edumeet/rooms/${roomId}/livekit-token`);
    return res.data;
  },

  listNotes: async (roomId) => {
    const res = await api.get(`/edumeet/rooms/${roomId}/notes`);
    return res.data?.notes || [];
  },

  createNote: async (roomId, payload) => {
    const res = await api.post(`/edumeet/rooms/${roomId}/notes`, payload);
    return res.data;
  },

  updateNote: async (roomId, noteId, payload) => {
    const res = await api.patch(`/edumeet/rooms/${roomId}/notes/${noteId}`, payload);
    return res.data;
  },

  deleteNote: async (roomId, noteId) => {
    const res = await api.delete(`/edumeet/rooms/${roomId}/notes/${noteId}`);
    return res.data;
  },

  getHandQueue: async (roomId) => {
    const res = await api.get(`/edumeet/rooms/${roomId}/hand-queue`);
    return res.data?.queue || [];
  },

  updateHandQueue: async (roomId, userId, action) => {
    const res = await api.post(`/edumeet/rooms/${roomId}/hand-queue/${userId}`, { action });
    return res.data;
  },
};

export default eduMeetService;
