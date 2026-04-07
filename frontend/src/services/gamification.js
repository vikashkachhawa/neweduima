import api from './api';

const gamificationService = {
  getStats: () =>
    api.get('/gamification/stats').then(r => r.data),

  getGames: () =>
    api.get('/gamification/games').then(r => r.data),

  submitScore: (gameId, payload) =>
    api.post(`/gamification/games/${gameId}/submit`, payload).then(r => r.data),

  getLeaderboard: (period = 'total') =>
    api.get('/gamification/leaderboard', { params: { period } }).then(r => r.data),

  getDailyChallenges: () =>
    api.get('/gamification/daily-challenges').then(r => r.data),

  completeDailyChallenge: (challengeId, score) =>
    api.post(`/gamification/daily-challenges/${challengeId}/complete`, { score }).then(r => r.data),

  getAchievements: () =>
    api.get('/gamification/achievements').then(r => r.data),
};

export default gamificationService;
