import api from './api';

export const superAdminTemplateService = {
  listStreams: async () => {
    const response = await api.get('/super-admin/templates/streams');
    return response.data;
  },
  createStream: async (payload) => {
    const response = await api.post('/super-admin/templates/streams', payload);
    return response.data;
  },
  listExamPatterns: async () => {
    const response = await api.get('/super-admin/templates/exam-patterns');
    return response.data;
  },
  createExamPattern: async (payload) => {
    const response = await api.post('/super-admin/templates/exam-patterns', payload);
    return response.data;
  },
  listHolidayPresets: async () => {
    const response = await api.get('/super-admin/templates/holiday-presets');
    return response.data;
  },
  createHolidayPreset: async (payload) => {
    const response = await api.post('/super-admin/templates/holiday-presets', payload);
    return response.data;
  }
};

export const schoolTemplateService = {
  listStreams: async () => {
    const response = await api.get('/school-setup/templates/streams');
    return response.data;
  },
  listExamPatterns: async () => {
    const response = await api.get('/school-setup/templates/exam-patterns');
    return response.data;
  },
  listHolidayPresets: async () => {
    const response = await api.get('/school-setup/templates/holiday-presets');
    return response.data;
  }
};
