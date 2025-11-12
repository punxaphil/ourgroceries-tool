import { Router, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { FormattedMasterList } from '../types.js';
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
import { createHttpError } from '../utils/httpError.js';

const AUTH_REQUIRED_MESSAGE = 'Authentication required.';

const masterRouter = Router();

function respondWithMasterList(res: Response, masterList: FormattedMasterList): void {
  res.json({ masterList });
}

function registerMasterRoute<Input>(
  path: string,
  parse: (body: unknown) => Input,
  operate: (sessionId: string, input: Input) => Promise<FormattedMasterList>
): void {
  masterRouter.post(
    path,
    asyncHandler(async (req, res) => {
      const sessionId = req.sessionId;
      if (!sessionId) throw createHttpError(401, AUTH_REQUIRED_MESSAGE);
      const masterList = await operate(sessionId, parse(req.body));
      respondWithMasterList(res, masterList);
    })
  );
}

registerMasterRoute('/move', parseMoveMasterItemsInput, moveMasterItems);
registerMasterRoute('/delete', parseDeleteMasterItemsInput, deleteMasterItems);
registerMasterRoute('/rename-item', parseRenameMasterItemInput, renameMasterItem);
registerMasterRoute('/rename-category', parseRenameMasterCategoryInput, renameMasterCategory);
registerMasterRoute('/create-category', parseCreateMasterCategoryInput, createMasterCategory);
registerMasterRoute('/delete-category', parseDeleteMasterCategoryInput, deleteMasterCategory);
registerMasterRoute('/reorder-categories', parseReorderMasterCategoriesInput, reorderMasterCategories);

export default masterRouter;
