import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getListsPayload } from '../services/listAggregator.js';
import { createHttpError } from '../utils/httpError.js';

const AUTH_REQUIRED_MESSAGE = 'Authentication required.';

const listsRouter = Router();

listsRouter.get(
  '/lists',
  asyncHandler(async (req, res) => {
    const sessionId = req.sessionId;
    if (!sessionId) throw createHttpError(401, AUTH_REQUIRED_MESSAGE);
    const payload = await getListsPayload(sessionId);
    res.json(payload);
  })
);

export default listsRouter;
