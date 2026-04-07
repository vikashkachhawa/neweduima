import express from 'express';
import auth from '../middleware/auth.js';
import {
  createQuestion,
  listQuestions,
  getQuestion,
  getQuestionReplies,
  createReply
} from '../controllers/forumController.js';
import {
  deleteQuestion,
  deleteReply,
  markQuestionHelpful,
  markReplyHelpful
} from '../controllers/forumController.js';

const router = express.Router();

router.use(auth);

router.post('/questions', createQuestion);
router.get('/questions', listQuestions);
router.get('/questions/:questionId', getQuestion);
router.get('/questions/:questionId/replies', getQuestionReplies);
router.post('/questions/:questionId/replies', createReply);
router.delete('/questions/:questionId', deleteQuestion);
router.post('/questions/:questionId/helpful', markQuestionHelpful);
router.delete('/replies/:replyId', deleteReply);
router.post('/replies/:replyId/helpful', markReplyHelpful);

export default router;
