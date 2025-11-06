import { Router, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  parseMoveMasterItemsInput,
  parseDeleteMasterItemsInput,
  parseRenameMasterItemInput,
  parseRenameMasterCategoryInput,
  parseCreateMasterCategoryInput,
  parseDeleteMasterCategoryInput,
  parseReorderMasterCategoriesInput,
} from '../services/masterList/inputs.js';
import {
  moveMasterItems,
  deleteMasterItems,
  renameMasterItem,
  renameMasterCategory,
  createMasterCategory,
  deleteMasterCategory,
  reorderMasterCategories,
} from '../services/masterList/operations.js';

const router = Router();

function respondWithMasterList(res: Response, masterList: unknown): void {
  res.json({ masterList });
}

router.post(
  '/move',
  asyncHandler(async (req, res) => {
    const masterList = await moveMasterItems(parseMoveMasterItemsInput(req.body));
    respondWithMasterList(res, masterList);
  })
);

router.post(
  '/delete',
  asyncHandler(async (req, res) => {
    const masterList = await deleteMasterItems(parseDeleteMasterItemsInput(req.body));
    respondWithMasterList(res, masterList);
  })
);

router.post(
  '/rename-item',
  asyncHandler(async (req, res) => {
    const masterList = await renameMasterItem(parseRenameMasterItemInput(req.body));
    respondWithMasterList(res, masterList);
  })
);

router.post(
  '/rename-category',
  asyncHandler(async (req, res) => {
    const masterList = await renameMasterCategory(parseRenameMasterCategoryInput(req.body));
    respondWithMasterList(res, masterList);
  })
);

router.post(
  '/create-category',
  asyncHandler(async (req, res) => {
    const masterList = await createMasterCategory(parseCreateMasterCategoryInput(req.body));
    respondWithMasterList(res, masterList);
  })
);

router.post(
  '/delete-category',
  asyncHandler(async (req, res) => {
    const masterList = await deleteMasterCategory(parseDeleteMasterCategoryInput(req.body));
    respondWithMasterList(res, masterList);
  })
);

router.post(
  '/reorder-categories',
  asyncHandler(async (req, res) => {
    const masterList = await reorderMasterCategories(parseReorderMasterCategoriesInput(req.body));
    respondWithMasterList(res, masterList);
  })
);

export const masterRoutes = router;
export default router;
