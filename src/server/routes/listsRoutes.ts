import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getListsPayload } from '../services/listAggregator.js';

const listsRouter = Router();

listsRouter.get(
  '/lists',
  asyncHandler(async (_req, res) => {
    const payload = await getListsPayload();
    res.json(payload);
  })
);

export default listsRouter;
