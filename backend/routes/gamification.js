import express from 'express';
import auth from '../middleware/auth.js';
import {
  getStudentStats,
  getGames,
  submitScore,
  getLeaderboard,
  getDailyChallenges,
  completeDailyChallenge,
  getAchievements,
} from '../controllers/gamificationController.js';

const router = express.Router();

router.use(auth);

router.get('/stats',                          getStudentStats);
router.get('/games',                          getGames);
router.post('/games/:gameId/submit',          submitScore);
router.get('/leaderboard',                    getLeaderboard);
router.get('/daily-challenges',               getDailyChallenges);
router.post('/daily-challenges/:challengeId/complete', completeDailyChallenge);
router.get('/achievements',                   getAchievements);

export default router;
