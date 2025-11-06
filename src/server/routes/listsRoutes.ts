import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getListsPayload } from '../services/listAggregator.js';

const router = Router();

router.get(
  '/lists',
  asyncHandler(async (_req, res) => {
    const payload = await getListsPayload();
    res.json(payload);
  })
);

export const listsRoutes = router;
export default router;
