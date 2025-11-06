import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectLiveReload from "connect-livereload";
import livereload from "livereload";
import {
  InvalidLoginException,
  OurGroceries,
  ListResponse,
} from "ourgroceries";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticDir = path.join(__dirname, "..", "static");

const liveReloadPreference = (process.env.ENABLE_LIVE_RELOAD ?? "")
  .trim()
  .toLowerCase();
const enableLiveReload =
  liveReloadPreference === ""
    ? process.env.NODE_ENV !== "production"
    : liveReloadPreference === "true" ||
      liveReloadPreference === "1" ||
      liveReloadPreference === "on";

const app = express();

let liveReloadServer: ReturnType<typeof livereload.createServer> | null = null;

if (enableLiveReload) {
  liveReloadServer = livereload.createServer();
  liveReloadServer.watch(staticDir);
  app.use(connectLiveReload());
  console.log(`LiveReload enabled! watching ${staticDir}`);

  const shutdownLiveReload = () => {
    if (liveReloadServer) {
      liveReloadServer.close();
      liveReloadServer = null;
    }
  };

  process.once("SIGINT", shutdownLiveReload);
  process.once("SIGTERM", shutdownLiveReload);
  process.once("exit", shutdownLiveReload);
} else {
  console.log(
    "LiveReload disabled; set ENABLE_LIVE_RELOAD=true to enable automatic refresh.",
  );
}

const port = Number(process.env.PORT) || 8000;

app.use(express.json());
app.use(express.static(staticDir));

type ShoppingListSummary = { id: string; name: string };

interface CategoryMeta {
  id: string;
  name: string;
  sortOrder?: string;
}

interface FormattedItem {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string;
  crossedOff: boolean;
  note?: string;
}

interface FormattedSection {
  id: string;
  name: string;
  items: FormattedItem[];
  sortOrder?: string;
}

interface FormattedMasterList {
  id: string;
  name: string;
  itemCount: number;
  sections: FormattedSection[];
}

interface ListsPayload {
  lists: ShoppingListSummary[];
  masterList: FormattedMasterList;
}

let clientPromise: Promise<OurGroceries> | null = null;

function assertCredentials(): { email: string; password: string } {
  const email = process.env.OURGROCERIES_EMAIL;
  const password = process.env.OURGROCERIES_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "OurGroceries credentials are not configured. Set OURGROCERIES_EMAIL and OURGROCERIES_PASSWORD.",
    );
  }

  if (email === "your_email@example.com") {
    throw new Error(
      "OURGROCERIES_EMAIL is using the placeholder value. Update your environment variables.",
    );
  }

  return { email, password };
}

async function getClient(): Promise<OurGroceries> {
  if (clientPromise) {
    return clientPromise;
  }

  const { email, password } = assertCredentials();

  clientPromise = (async () => {
    const instance = new OurGroceries({ username: email, password });
    await instance.login();
    return instance;
  })();

  try {
    const client = await clientPromise;
    return client;
  } catch (error) {
    clientPromise = null;
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStringOrUndefined(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function compareBySortOrderAndName<
  T extends { sortOrder?: string; name: string },
>(a: T, b: T): number {
  const aHasSort = typeof a.sortOrder === "string" && a.sortOrder.length > 0;
  const bHasSort = typeof b.sortOrder === "string" && b.sortOrder.length > 0;

  if (aHasSort && bHasSort) {
    const aSort = a.sortOrder as string;
    const bSort = b.sortOrder as string;
    if (aSort < bSort) {
      return -1;
    }
    if (aSort > bSort) {
      return 1;
    }
  } else if (aHasSort !== bHasSort) {
    return aHasSort ? -1 : 1;
  }

  return 0;
}

function extractShoppingLists(payload: unknown): ShoppingListSummary[] {
  const summaries: ShoppingListSummary[] = [];

  function traverse(node: unknown): void {
    if (Array.isArray(node)) {
      node.forEach(traverse);
      return;
    }

    if (!isRecord(node)) {
      return;
    }

    Object.entries(node).forEach(([key, value]) => {
      const lowered = key.toLowerCase();
      if (lowered.endsWith("list") || lowered.endsWith("lists")) {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (isRecord(item)) {
              const id = toStringOrUndefined(item.id);
              const name = toStringOrUndefined(item.name);
              if (id && name) {
                summaries.push({ id, name });
              }
            }
          });
        }
      }
      traverse(value);
    });
  }

  traverse(payload);

  const seen = new Set<string>();
  const unique: ShoppingListSummary[] = [];
  summaries.forEach((entry) => {
    if (!seen.has(entry.id)) {
      seen.add(entry.id);
      unique.push(entry);
    }
  });

  return unique;
}

function buildCategoryIndex(payload: unknown): {
  categories: CategoryMeta[];
  lookup: Map<string, string>;
  categoryListId: string | null;
} {
  if (!isRecord(payload)) {
    return { categories: [], lookup: new Map(), categoryListId: null };
  }

  const container = isRecord(payload.list)
    ? payload.list
    : isRecord(payload.categoryList)
      ? payload.categoryList
      : null;

  let categoryListId: string | null = null;
  if (isRecord(container)) {
    const id = toStringOrUndefined(container.id);
    categoryListId = id ?? null;
  }

  const items: unknown[] = Array.isArray(container?.items)
    ? (container?.items as unknown[])
    : [];

  const categories: CategoryMeta[] = [];
  const lookup = new Map<string, string>();

  items.forEach((entry) => {
    if (!isRecord(entry)) return;
    const id = toStringOrUndefined(entry.id);
    const name =
      toStringOrUndefined(entry.value) ?? toStringOrUndefined(entry.name);
    if (!id || !name) return;

    const category: CategoryMeta = { id, name };
    const sortOrder = toStringOrUndefined(entry.sortOrder);
    if (sortOrder) {
      category.sortOrder = sortOrder;
    }
    categories.push(category);
    lookup.set(id, name);
  });

  categories.sort(compareBySortOrderAndName);

  return { categories, lookup, categoryListId };
}

function formatMasterList(
  payload: ListResponse,
  categories: CategoryMeta[],
  categoryLookup: Map<string, string>,
): FormattedMasterList {
  const listRecord =
    isRecord(payload) && isRecord(payload.list) ? payload.list : null;

  if (!isRecord(listRecord)) {
    throw new Error("Unexpected master list response structure.");
  }

  const listId = toStringOrUndefined(listRecord.id) ?? "UNKNOWN";
  const name = toStringOrUndefined(listRecord.name) ?? "Master List";

  const itemsArray: unknown[] = Array.isArray(listRecord.items)
    ? (listRecord.items as unknown[])
    : [];

  const sectionLookup = new Map<string, FormattedSection>();
  const sections: FormattedSection[] = [];

  categories.forEach((category) => {
    const section: FormattedSection = {
      id: category.id,
      name: category.name,
      items: [],
    };
    if (category.sortOrder) {
      section.sortOrder = category.sortOrder;
    }
    sectionLookup.set(category.id, section);
    sections.push(section);
  });

  const fallbackSection: FormattedSection = {
    id: "uncategorized",
    name: "Uncategorized",
    items: [],
    sortOrder: "~~~~",
  };

  const flattenedItems: FormattedItem[] = [];

  itemsArray.forEach((entry) => {
    if (!isRecord(entry)) return;
    const id = toStringOrUndefined(entry.id);
    if (!id) return;

    const label =
      toStringOrUndefined(entry.value) ??
      toStringOrUndefined(entry.name) ??
      "Unnamed Item";

    const categoryIdRaw = toStringOrUndefined(entry.categoryId);
    const categoryId = categoryIdRaw ?? null;
    const categoryName =
      (categoryId ? categoryLookup.get(categoryId) : undefined) ?? "";

    const formatted: FormattedItem = {
      id,
      name: label,
      categoryId,
      categoryName,
      crossedOff: Boolean(entry.crossedOff),
    };

    if (typeof entry.note === "string" && entry.note.trim().length > 0) {
      formatted.note = entry.note;
    }

    flattenedItems.push(formatted);

    const section = categoryId
      ? (sectionLookup.get(categoryId) ?? fallbackSection)
      : fallbackSection;
    section.items.push(formatted);
  });

  if (fallbackSection.items.length > 0) {
    sections.push(fallbackSection);
  }

  sections.sort(compareBySortOrderAndName);
  sections.forEach((section) => {
    section.items.sort((a, b) => a.name.localeCompare(b.name));
  });

  return {
    id: listId,
    name,
    itemCount: flattenedItems.length,
    sections,
  };
}

async function fetchListsPayload(): Promise<ListsPayload> {
  const client = await getClient();

  const overview = await client.getMyLists();
  const shoppingLists = extractShoppingLists(overview);

  if (shoppingLists.length === 0) {
    throw new Error("No shopping lists found in OurGroceries response.");
  }

  const categoryResponse = await client.getCategoryItems();
  const { categories, lookup } = buildCategoryIndex(categoryResponse);

  const masterResponse = await client.getMasterList();
  const masterList = formatMasterList(masterResponse, categories, lookup);

  return { lists: shoppingLists, masterList };
}

function handleKnownErrors(error: unknown): never {
  if (error instanceof InvalidLoginException) {
    const wrapped = new Error("OurGroceries login failed.");
    (wrapped as Error & { status?: number }).status = 401;
    throw wrapped;
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error("Unknown error occurred.");
}

function sanitizeString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

app.get(
  "/api/lists",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = await fetchListsPayload();
      res.json(payload);
    } catch (error) {
      try {
        handleKnownErrors(error);
      } catch (handled) {
        next(handled);
      }
    }
  },
);

interface MoveItemInput {
  item_id: string;
  item_name: string;
}

interface MoveItemsRequestBody {
  list_id: string;
  items: MoveItemInput[];
  target_category_id?: string | null;
}

app.post(
  "/api/master/move",
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as MoveItemsRequestBody;

    if (!body || typeof body !== "object") {
      res.status(400).json({ detail: "Invalid request payload." });
      return;
    }

    const listId = sanitizeString(body.list_id);
    if (!listId) {
      res.status(400).json({ detail: "list_id is required." });
      return;
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      res.status(400).json({ detail: "No items provided for move operation." });
      return;
    }

    const targetCategoryIdRaw = sanitizeString(body.target_category_id ?? null);
    const targetCategoryId =
      targetCategoryIdRaw === null ? null : targetCategoryIdRaw;

    try {
      const client = await getClient();
      const changer = client as unknown as {
        changeItemOnList: (
          list: string,
          item: string,
          category: string | null,
          value: string,
        ) => Promise<unknown>;
      };

      for (const entry of body.items) {
        const itemId = sanitizeString(entry?.item_id);
        const itemName = sanitizeString(entry?.item_name);
        if (!itemId || !itemName) {
          throw new Error("Each item requires item_id and item_name.");
        }

        await changer.changeItemOnList(
          listId,
          itemId,
          targetCategoryId,
          itemName,
        );
      }

      const payload = await fetchListsPayload();
      res.json({ masterList: payload.masterList });
    } catch (error) {
      try {
        handleKnownErrors(error);
      } catch (handled) {
        next(handled);
      }
    }
  },
);

interface DeleteItemsRequestBody {
  list_id: string;
  item_ids: string[];
}

app.post(
  "/api/master/delete",
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as DeleteItemsRequestBody;

    if (!body || typeof body !== "object") {
      res.status(400).json({ detail: "Invalid request payload." });
      return;
    }

    const listId = sanitizeString(body.list_id);
    if (!listId) {
      res.status(400).json({ detail: "list_id is required." });
      return;
    }

    if (!Array.isArray(body.item_ids) || body.item_ids.length === 0) {
      res
        .status(400)
        .json({ detail: "No items provided for delete operation." });
      return;
    }

    try {
      const client = await getClient();
      for (const rawId of body.item_ids) {
        const itemId = sanitizeString(rawId);
        if (!itemId) {
          throw new Error("Each item id must be a non-empty string.");
        }
        await client.removeItemFromList(listId, itemId);
      }

      const payload = await fetchListsPayload();
      res.json({ masterList: payload.masterList });
    } catch (error) {
      try {
        handleKnownErrors(error);
      } catch (handled) {
        next(handled);
      }
    }
  },
);

interface RenameItemRequestBody {
  itemId: string;
  newName: string;
}

app.post(
  "/api/master/rename-item",
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as RenameItemRequestBody;

    const itemId = sanitizeString(body?.itemId);
    const newName = sanitizeString(body?.newName);

    if (!itemId || !newName) {
      res.status(400).json({ detail: "itemId and newName are required." });
      return;
    }

    try {
      const payload = await fetchListsPayload();
      const masterList = payload.masterList;

      let targetItem: { categoryId: string | null } | null = null;

      for (const section of masterList.sections) {
        const found = section.items.find((item) => item.id === itemId);
        if (found) {
          targetItem = { categoryId: found.categoryId };
          break;
        }
      }

      if (!targetItem) {
        res.status(404).json({ detail: "Item not found." });
        return;
      }

      const client = await getClient();
      const changer = client as unknown as {
        changeItemOnList: (
          list: string,
          item: string,
          category: string | null,
          value: string,
        ) => Promise<unknown>;
      };

      await changer.changeItemOnList(
        masterList.id,
        itemId,
        targetItem.categoryId,
        newName,
      );

      const updated = await fetchListsPayload();
      res.json({ masterList: updated.masterList });
    } catch (error) {
      try {
        handleKnownErrors(error);
      } catch (handled) {
        next(handled);
      }
    }
  },
);

interface RenameCategoryRequestBody {
  categoryId: string;
  newName: string;
}

app.post(
  "/api/master/rename-category",
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as RenameCategoryRequestBody;

    const categoryId = sanitizeString(body?.categoryId);
    const newName = sanitizeString(body?.newName);

    if (!categoryId || !newName) {
      res.status(400).json({ detail: "categoryId and newName are required." });
      return;
    }

    try {
      const client = await getClient();
      const categoryResponse = await client.getCategoryItems();
      const { categoryListId } = buildCategoryIndex(categoryResponse);

      if (!categoryListId) {
        throw new Error("Category list identifier not available.");
      }

      const changer = client as unknown as {
        changeItemOnList: (
          list: string,
          item: string,
          category: string | null,
          value: string,
        ) => Promise<unknown>;
      };

      await changer.changeItemOnList(categoryListId, categoryId, null, newName);

      const payload = await fetchListsPayload();
      res.json({ masterList: payload.masterList });
    } catch (error) {
      try {
        handleKnownErrors(error);
      } catch (handled) {
        next(handled);
      }
    }
  },
);

interface CreateCategoryRequestBody {
  name: string;
}

app.post(
  "/api/master/create-category",
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as CreateCategoryRequestBody;
    const name = sanitizeString(body?.name);

    if (!name) {
      res.status(400).json({ detail: "Category name cannot be empty." });
      return;
    }

    try {
      const client = await getClient();
      await client.createCategory(name);

      const payload = await fetchListsPayload();
      res.json({ masterList: payload.masterList });
    } catch (error) {
      try {
        handleKnownErrors(error);
      } catch (handled) {
        next(handled);
      }
    }
  },
);

interface DeleteCategoryRequestBody {
  categoryId: string;
}

app.post(
  "/api/master/delete-category",
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as DeleteCategoryRequestBody;
    const categoryId = sanitizeString(body?.categoryId);

    if (!categoryId) {
      res.status(400).json({ detail: "categoryId is required." });
      return;
    }

    try {
      const client = await getClient();
      const categoryResponse = await client.getCategoryItems();
      const { categoryListId } = buildCategoryIndex(categoryResponse);

      if (!categoryListId) {
        throw new Error("Category list identifier not available.");
      }

      await client.removeItemFromList(categoryListId, categoryId);

      const payload = await fetchListsPayload();
      res.json({ masterList: payload.masterList });
    } catch (error) {
      try {
        handleKnownErrors(error);
      } catch (handled) {
        next(handled);
      }
    }
  },
);

interface ReorderCategoriesRequestBody {
  itemId: string;
  nextItemId?: string | null;
}

app.post(
  "/api/master/reorder-categories",
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as ReorderCategoriesRequestBody;

    const itemId = sanitizeString(body?.itemId);
    const nextItemIdRaw =
      body?.nextItemId === null
        ? null
        : sanitizeString(body?.nextItemId ?? null);

    if (!itemId) {
      res.status(400).json({ detail: "itemId is required." });
      return;
    }

    try {
      const client = await getClient();
      const categoryResponse = await client.getCategoryItems();
      const { categoryListId } = buildCategoryIndex(categoryResponse);

      if (!categoryListId) {
        throw new Error("Category list identifier not available.");
      }

      const internal = client as unknown as {
        post: (
          command: string,
          payload?: Record<string, unknown>,
        ) => Promise<unknown>;
      };

      await internal.post("reorderItem", {
        listId: categoryListId,
        itemId,
        nextItemId: nextItemIdRaw ?? null,
        categoryId: null,
      });

      const payload = await fetchListsPayload();
      res.json({ masterList: payload.masterList });
    } catch (error) {
      try {
        handleKnownErrors(error);
      } catch (handled) {
        next(handled);
      }
    }
  },
);

app.use(
  (
    err: Error & { status?: number },
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const statusCode = err.status ?? 500;
    const message =
      statusCode === 500
        ? err.message || "An internal server error occurred."
        : err.message;
    if (statusCode >= 500) {
      console.error("[Error]", err);
    }
    res.status(statusCode).json({ detail: message });
  },
);

app.get("*", (_req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  getClient().catch((error) => {
    console.error(
      "Failed to establish initial OurGroceries connection:",
      error,
    );
  });
});
