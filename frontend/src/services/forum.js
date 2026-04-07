import api from './api';

export const forumService = {
  listQuestions: async (query = '', limit = 20) => {
    const response = await api.get('/forum/questions', {
      params: {
        q: query,
        limit
      }
    });

    return {
      questions: response.data?.questions || [],
      myInterests: response.data?.myInterests || []
    };
  },

  getQuestion: async (questionId) => {
    const response = await api.get(`/forum/questions/${questionId}`);
    return response.data;
  },

  createQuestion: async ({ title, question, interests }) => {
    const response = await api.post('/forum/questions', { title, question, interests });
    return response.data;
  },

  getReplies: async (questionId) => {
    const response = await api.get(`/forum/questions/${questionId}/replies`);
    return response.data?.replies || [];
  },

  createReply: async (questionId, { reply, parentReplyId = null }) => {
    const response = await api.post(`/forum/questions/${questionId}/replies`, { reply, parentReplyId });
    return response.data;
  },

  deleteQuestion: async (questionId) => {
    const response = await api.delete(`/forum/questions/${questionId}`);
    return response.data;
  },

  deleteReply: async (replyId) => {
    const response = await api.delete(`/forum/replies/${replyId}`);
    return response.data;
  },

  markQuestionHelpful: async (questionId) => {
    const response = await api.post(`/forum/questions/${questionId}/helpful`);
    return response.data;
  },

  markReplyHelpful: async (replyId) => {
    const response = await api.post(`/forum/replies/${replyId}/helpful`);
    return response.data;
  }
};
