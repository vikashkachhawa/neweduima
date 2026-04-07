import api from './api';

const codeArenaService = {
  // ── Rooms ──────────────────────────────────────────────────────────────

  createRoom: async ({ title, description, duration_minutes, mode, max_attempts }) => {
    const res = await api.post('/codearena/rooms', { title, description, duration_minutes, mode, max_attempts });
    return res.data;
  },

  listRooms: async (status = '') => {
    const params = status ? { status } : {};
    const res = await api.get('/codearena/rooms', { params });
    return res.data?.rooms || [];
  },

  getRoom: async (roomId) => {
    const res = await api.get(`/codearena/rooms/${roomId}`);
    return res.data;
  },

  updateRoom: async (roomId, data) => {
    const res = await api.put(`/codearena/rooms/${roomId}`, data);
    return res.data;
  },

  startRoom: async (roomId) => {
    const res = await api.post(`/codearena/rooms/${roomId}/start`);
    return res.data;
  },

  endRoom: async (roomId) => {
    const res = await api.post(`/codearena/rooms/${roomId}/end`);
    return res.data;
  },

  deleteRoom: async (roomId) => {
    const res = await api.delete(`/codearena/rooms/${roomId}`);
    return res.data;
  },

  // ── Participants ───────────────────────────────────────────────────────

  inviteParticipants: async (roomId, user_ids) => {
    const res = await api.post(`/codearena/rooms/${roomId}/invite`, { user_ids });
    return res.data;
  },

  joinByCode: async (invite_code) => {
    const res = await api.post('/codearena/join', { invite_code });
    return res.data;
  },

  joinRoom: async (roomId) => {
    const res = await api.post(`/codearena/rooms/${roomId}/join`);
    return res.data;
  },

  removeParticipant: async (roomId, userId) => {
    const res = await api.delete(`/codearena/rooms/${roomId}/participants/${userId}`);
    return res.data;
  },

  getParticipants: async (roomId) => {
    const res = await api.get(`/codearena/rooms/${roomId}/participants`);
    return res.data?.participants || [];
  },

  // ── Problems ───────────────────────────────────────────────────────────

  addProblem: async (roomId, data) => {
    const res = await api.post(`/codearena/rooms/${roomId}/problems`, data);
    return res.data;
  },

  updateProblem: async (roomId, problemId, data) => {
    const res = await api.put(`/codearena/rooms/${roomId}/problems/${problemId}`, data);
    return res.data;
  },

  deleteProblem: async (roomId, problemId) => {
    const res = await api.delete(`/codearena/rooms/${roomId}/problems/${problemId}`);
    return res.data;
  },

  addTestCase: async (roomId, problemId, data) => {
    const res = await api.post(`/codearena/rooms/${roomId}/problems/${problemId}/test-cases`, data);
    return res.data;
  },

  deleteTestCase: async (roomId, problemId, testCaseId) => {
    const res = await api.delete(`/codearena/rooms/${roomId}/problems/${problemId}/test-cases/${testCaseId}`);
    return res.data;
  },

  // ── Code execution ─────────────────────────────────────────────────────

  runCode: async (roomId, { language, code, input }) => {
    const res = await api.post(`/codearena/rooms/${roomId}/run`, { language, code, input });
    return res.data;
  },

  submitSolution: async (roomId, problemId, { language, code }) => {
    const res = await api.post(`/codearena/rooms/${roomId}/problems/${problemId}/submit`, { language, code });
    return res.data;
  },

  // ── Results ────────────────────────────────────────────────────────────

  getMySubmissions: async (roomId, problemId) => {
    const res = await api.get(`/codearena/rooms/${roomId}/problems/${problemId}/my-submissions`);
    return res.data?.submissions || [];
  },

  getSubmissionDetail: async (roomId, submissionId) => {
    const res = await api.get(`/codearena/rooms/${roomId}/submissions/${submissionId}`);
    return res.data;
  },

  getRoomDashboard: async (roomId) => {
    const res = await api.get(`/codearena/rooms/${roomId}/dashboard`);
    return res.data;
  },

  getAvailableStudents: async (roomId) => {
    const res = await api.get(`/codearena/rooms/${roomId}/available-students`);
    return res.data?.students || [];
  },
};

export default codeArenaService;
