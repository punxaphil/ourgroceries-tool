const { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } =
  React;

const HASH_MASTER = "#/master";
const HASH_LISTS = "#/lists";
const PENDING_OPERATIONS_KEY = "master-pending-operations";
const FILTER_STATE_KEY = "master-filter-state";
const PENDING_FILTER_KEY = "master-pending-filter";

const CATEGORY_COLORS = [
  "#fde68a",
  "#bbf7d0",
  "#bfdbfe",
  "#fbcfe8",
  "#ede9fe",
  "#fee2e2",
  "#dcfce7",
  "#e0f2fe",
];

const resolveViewFromHash = (hash) =>
  hash === HASH_MASTER ? "master" : "lists";

const normalizeCategoryId = (categoryId) =>
  categoryId === null || categoryId === undefined || categoryId === ""
    ? "uncategorized"
    : categoryId;

const denormalizeCategoryId = (categoryId) =>
  categoryId === "uncategorized" ? null : categoryId;

const buildItemLookup = (masterList) => {
  const lookup = new Map();
  if (!masterList) {
    return lookup;
  }
  const sections = Array.isArray(masterList.sections)
    ? masterList.sections
    : [];
  sections.forEach((section) => {
    const items = Array.isArray(section.items) ? section.items : [];
    items.forEach((item) => {
      if (item && item.id) {
        lookup.set(item.id, item);
      }
    });
  });
  return lookup;
};

const TrashIcon = () =>
  React.createElement(
    "svg",
    {
      width: "14",
      height: "16",
      viewBox: "0 0 14 16",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
    },
    React.createElement("path", {
      d: "M2.75 4.75h8.5l-.57 8.05a1.5 1.5 0 0 1-1.49 1.38H4.81a1.5 1.5 0 0 1-1.49-1.38L2.75 4.75Zm2.5-2.5h3.5l.5 1.5h-4.5l.5-1.5Zm-3 1.5h10",
      stroke: "currentColor",
      strokeWidth: "1.4",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    }),
    React.createElement("path", {
      d: "M6 7v4.25",
      stroke: "currentColor",
      strokeWidth: "1.4",
      strokeLinecap: "round",
    }),
    React.createElement("path", {
      d: "M8 7v4.25",
      stroke: "currentColor",
      strokeWidth: "1.4",
      strokeLinecap: "round",
    }),
  );

const PenIcon = () =>
  React.createElement(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 16 16",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
    },
    React.createElement("path", {
      d: "M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25a1.75 1.75 0 0 1 .445-.758l8.61-8.61Z",
      fill: "currentColor",
    }),
    React.createElement("path", {
      d: "M11.5 4.5 13.25 6.25",
      stroke: "white",
      strokeWidth: "1.5",
      strokeLinecap: "round",
    }),
  );

const FilterIcon = () =>
  React.createElement(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 16 16",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
    },
    React.createElement("path", {
      d: "M2 4h12M4 8h8M6 12h4",
      stroke: "currentColor",
      strokeWidth: "1.5",
      strokeLinecap: "round",
    }),
  );

function App() {
  const [data, setData] = useState({ lists: [], masterList: null });
  const [status, setStatus] = useState("Loading lists…");
  const [view, setView] = useState(resolveViewFromHash(window.location.hash));
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [pendingMoves, setPendingMoves] = useState({});
  const [pendingDeletes, setPendingDeletes] = useState({});
  const [filterCategories, setFilterCategories] = useState(() => {
    try {
      const stored = window.localStorage.getItem(FILTER_STATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(parsed.categories || []);
      }
    } catch (error) {
      console.error("Failed to load filter state:", error);
    }
    return new Set();
  });
  const [showPendingOnly, setShowPendingOnly] = useState(() => {
    try {
      const stored = window.localStorage.getItem(PENDING_FILTER_KEY);
      if (stored) {
        return JSON.parse(stored) || false;
      }
    } catch (error) {
      console.error("Failed to load pending filter state:", error);
    }
    return false;
  });
  const [toasts, setToasts] = useState([]);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applySteps, setApplySteps] = useState([]);
  const [isApplying, setIsApplying] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [createCategoryModalOpen, setCreateCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const toastTimeouts = useRef(new Map());
  const hasLoadedPendingRef = useRef(false);
  const categoryListRef = useRef(null);
  const categoryPositions = useRef(new Map());

  const addToast = useCallback((message) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, message }]);
    const timeoutId = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      toastTimeouts.current.delete(id);
    }, 2800);
    toastTimeouts.current.set(id, timeoutId);
  }, []);

  useEffect(
    () => () => {
      toastTimeouts.current.forEach((timeoutId) =>
        window.clearTimeout(timeoutId),
      );
      toastTimeouts.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = HASH_LISTS;
    }
  }, []);

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/lists");
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }
      const payload = await response.json();
      const lists = Array.isArray(payload.lists) ? payload.lists : [];
      const masterList = payload.masterList || null;
      setData({ lists, masterList });
      if (lists.length === 0 && (!masterList || masterList.itemCount === 0)) {
        setStatus("No lists found.");
      } else {
        setStatus(null);
      }
    } catch (error) {
      console.error(error);
      setStatus("Unable to load lists. Check credentials and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  useEffect(() => {
    const handleHashChange = () => {
      setView(resolveViewFromHash(window.location.hash));
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const masterList = data.masterList;
  const itemLookup = useMemo(() => buildItemLookup(masterList), [masterList]);

  const categoryList = useMemo(() => {
    if (!masterList) {
      return [];
    }
    const sections = Array.isArray(masterList.sections)
      ? masterList.sections
      : [];
    return sections.map((section) => ({
      id: normalizeCategoryId(section.id),
      name: section.name || "Uncategorized",
    }));
  }, [masterList]);

  const sortedCategoryList = useMemo(() => {
    const sorted = [...categoryList];
    sorted.sort((a, b) => {
      const aFiltered = filterCategories.has(a.id);
      const bFiltered = filterCategories.has(b.id);

      // Filtered categories come first
      if (aFiltered && !bFiltered) return -1;
      if (!aFiltered && bFiltered) return 1;

      // Within the same group, maintain original order
      return 0;
    });
    return sorted;
  }, [categoryList, filterCategories]);

  // FLIP animation for category reordering
  useLayoutEffect(() => {
    if (!categoryListRef.current) return;

    const items = categoryListRef.current.querySelectorAll(
      ".category-list-item",
    );
    const newPositions = new Map();

    items.forEach((item) => {
      const id = item.getAttribute("data-category-id");
      const rect = item.getBoundingClientRect();
      newPositions.set(id, rect.top);

      const oldTop = categoryPositions.current.get(id);
      if (oldTop !== undefined && oldTop !== rect.top) {
        const delta = oldTop - rect.top;
        item.style.transform = `translateY(${delta}px)`;
        item.style.transition = "none";

        requestAnimationFrame(() => {
          item.style.transition =
            "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
          item.style.transform = "translateY(0)";
        });
      }
    });

    categoryPositions.current = newPositions;
  }, [sortedCategoryList]);

  const categoryNameLookup = useMemo(() => {
    const lookup = new Map();
    categoryList.forEach((category) => {
      lookup.set(category.id, category.name);
    });
    return lookup;
  }, [categoryList]);

  const categoryColorMap = useMemo(() => {
    const map = {};
    categoryList.forEach((category, index) => {
      map[category.id] = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    });
    return map;
  }, [categoryList]);

  useEffect(() => {
    if (selectedCategoryId === null && categoryList.length > 0) {
      setSelectedCategoryId(categoryList[0].id);
    }
  }, [categoryList, selectedCategoryId]);

  useEffect(() => {
    if (!masterList || hasLoadedPendingRef.current) {
      return;
    }
    const raw = window.localStorage.getItem(PENDING_OPERATIONS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const storedMoves = Array.isArray(parsed?.moves) ? parsed.moves : [];
        const storedDeletes = Array.isArray(parsed?.deletes)
          ? parsed.deletes
          : [];

        const nextMoves = {};
        storedMoves.forEach((entry) => {
          if (!entry || !entry.itemId) {
            return;
          }
          const item = itemLookup.get(entry.itemId);
          if (!item) {
            return;
          }
          const targetId = normalizeCategoryId(entry.targetCategoryId);
          nextMoves[entry.itemId] = {
            itemId: entry.itemId,
            itemName: item.name,
            targetCategoryId: targetId,
            targetCategoryName:
              categoryNameLookup.get(targetId) ||
              entry.targetCategoryName ||
              "Uncategorized",
          };
        });

        const nextDeletes = {};
        storedDeletes.forEach((entry) => {
          if (!entry || !entry.itemId) {
            return;
          }
          const item = itemLookup.get(entry.itemId);
          if (!item) {
            return;
          }
          nextDeletes[entry.itemId] = {
            itemId: entry.itemId,
            itemName: item.name,
          };
        });

        setPendingMoves(nextMoves);
        setPendingDeletes(nextDeletes);

        // If pending filter is active but no pending items, turn it off
        if (
          Object.keys(nextMoves).length === 0 &&
          Object.keys(nextDeletes).length === 0
        ) {
          setShowPendingOnly(false);
        }
      } catch (error) {
        console.error("Unable to restore pending operations:", error);
      }
    }
    hasLoadedPendingRef.current = true;
  }, [masterList, itemLookup, categoryNameLookup]);

  useEffect(() => {
    if (!masterList) {
      return;
    }
    setPendingMoves((prev) => {
      let mutated = false;
      const next = {};
      Object.values(prev).forEach((move) => {
        const item = itemLookup.get(move.itemId);
        if (!item) {
          mutated = true;
          return;
        }
        const targetId = normalizeCategoryId(move.targetCategoryId);
        const targetName =
          categoryNameLookup.get(targetId) ||
          move.targetCategoryName ||
          "Uncategorized";
        const updated = {
          itemId: move.itemId,
          itemName: item.name,
          targetCategoryId: targetId,
          targetCategoryName: targetName,
        };
        next[move.itemId] = updated;
        if (
          !mutated &&
          (item.name !== move.itemName ||
            targetId !== move.targetCategoryId ||
            targetName !== move.targetCategoryName)
        ) {
          mutated = true;
        }
      });
      return mutated ? next : prev;
    });

    setPendingDeletes((prev) => {
      let mutated = false;
      const next = {};
      Object.values(prev).forEach((entry) => {
        const item = itemLookup.get(entry.itemId);
        if (!item) {
          mutated = true;
          return;
        }
        const updated = {
          itemId: entry.itemId,
          itemName: item.name,
        };
        next[entry.itemId] = updated;
        if (!mutated && item.name !== entry.itemName) {
          mutated = true;
        }
      });
      return mutated ? next : prev;
    });
  }, [masterList, itemLookup, categoryNameLookup]);

  useEffect(() => {
    if (!hasLoadedPendingRef.current) {
      return;
    }
    const payload = {
      moves: Object.values(pendingMoves),
      deletes: Object.values(pendingDeletes),
    };
    window.localStorage.setItem(
      PENDING_OPERATIONS_KEY,
      JSON.stringify(payload),
    );
  }, [pendingMoves, pendingDeletes]);

  useEffect(() => {
    const payload = {
      categories: Array.from(filterCategories),
    };
    window.localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(payload));
  }, [filterCategories]);

  useEffect(() => {
    window.localStorage.setItem(
      PENDING_FILTER_KEY,
      JSON.stringify(showPendingOnly),
    );
  }, [showPendingOnly]);

  // Auto-disable pending filter when no pending operations remain
  useEffect(() => {
    if (
      showPendingOnly &&
      Object.keys(pendingMoves).length === 0 &&
      Object.keys(pendingDeletes).length === 0
    ) {
      setShowPendingOnly(false);
      addToast("No pending changes remaining - showing all items");
    }
  }, [showPendingOnly, pendingMoves, pendingDeletes, addToast]);

  const handleSelectCategory = useCallback(
    (categoryId) => {
      if (isApplying) {
        return;
      }
      setSelectedCategoryId(categoryId);
    },
    [isApplying],
  );

  const handleToggleMove = useCallback(
    (item) => {
      if (isApplying) {
        return;
      }
      if (!selectedCategoryId) {
        addToast("Select a category before tagging items.");
        return;
      }

      const normalizedTarget = normalizeCategoryId(selectedCategoryId);
      const currentCategory = normalizeCategoryId(item.categoryId);

      setPendingDeletes((prev) => {
        if (!prev[item.id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[item.id];
        return next;
      });

      setPendingMoves((prev) => {
        const existing = prev[item.id];

        if (currentCategory === normalizedTarget && !existing) {
          addToast("Item is already in that category.");
          return prev;
        }

        if (existing && existing.targetCategoryId === normalizedTarget) {
          const next = { ...prev };
          delete next[item.id];
          return next;
        }

        const targetName =
          categoryNameLookup.get(normalizedTarget) || "Uncategorized";
        return {
          ...prev,
          [item.id]: {
            itemId: item.id,
            itemName: item.name,
            targetCategoryId: normalizedTarget,
            targetCategoryName: targetName,
          },
        };
      });
    },
    [isApplying, selectedCategoryId, categoryNameLookup, addToast],
  );

  const handleToggleDelete = useCallback(
    (item) => {
      if (isApplying) {
        return;
      }
      setPendingMoves((prev) => {
        if (!prev[item.id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[item.id];
        return next;
      });

      setPendingDeletes((prev) => {
        if (prev[item.id]) {
          const next = { ...prev };
          delete next[item.id];
          return next;
        }
        return {
          ...prev,
          [item.id]: {
            itemId: item.id,
            itemName: item.name,
          },
        };
      });
    },
    [isApplying],
  );

  const hasPendingChanges = useMemo(
    () =>
      Object.keys(pendingMoves).length > 0 ||
      Object.keys(pendingDeletes).length > 0,
    [pendingMoves, pendingDeletes],
  );

  const updateStepStatus = useCallback((index, status, errorMessage) => {
    setApplySteps((prev) =>
      prev.map((step, idx) =>
        idx === index
          ? {
              ...step,
              status,
              errorMessage: errorMessage ?? step.errorMessage ?? null,
            }
          : step,
      ),
    );
  }, []);

  const performOperations = useCallback(
    async (listId, moveEntries, deleteEntries) => {
      const remainingMoveIds = new Set(
        moveEntries.map((entry) => entry.itemId),
      );
      const remainingDeleteIds = new Set(
        deleteEntries.map((entry) => entry.itemId),
      );

      let hadErrors = false;

      const steps = [
        ...moveEntries.map((entry) => ({
          key: `move-${entry.itemId}`,
          type: "move",
          status: "pending",
          itemId: entry.itemId,
          itemName: entry.itemName,
          targetCategoryId: entry.targetCategoryId,
          targetCategoryName: entry.targetCategoryName,
        })),
        ...deleteEntries.map((entry) => ({
          key: `delete-${entry.itemId}`,
          type: "delete",
          status: "pending",
          itemId: entry.itemId,
          itemName: entry.itemName,
        })),
      ];

      const BATCH_SIZE = 5;

      // Process steps in batches
      for (let i = 0; i < steps.length; i += BATCH_SIZE) {
        const batch = steps.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (step, batchIndex) => {
          const index = i + batchIndex;
          updateStepStatus(index, "running");

          try {
            if (step.type === "move") {
              const response = await fetch("/api/master/move", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  list_id: listId,
                  items: [{ item_id: step.itemId, item_name: step.itemName }],
                  target_category_id: denormalizeCategoryId(
                    step.targetCategoryId,
                  ),
                }),
              });

              if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Request failed");
              }

              const payload = await response.json();
              const masterList = payload.masterList || null;
              if (masterList) {
                setData((prev) => ({ ...prev, masterList }));
              }
              remainingMoveIds.delete(step.itemId);
            } else {
              const response = await fetch("/api/master/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  list_id: listId,
                  item_ids: [step.itemId],
                }),
              });

              if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Request failed");
              }

              const payload = await response.json();
              const masterList = payload.masterList || null;
              if (masterList) {
                setData((prev) => ({ ...prev, masterList }));
              }
              remainingDeleteIds.delete(step.itemId);
            }

            updateStepStatus(index, "success");
          } catch (error) {
            console.error(error);
            hadErrors = true;
            const message =
              error instanceof Error ? error.message : "Request failed";
            updateStepStatus(index, "error", message);
          }
        });

        // Wait for all operations in this batch to complete
        await Promise.allSettled(batchPromises);
      }

      setPendingMoves((prev) => {
        if (remainingMoveIds.size === 0) {
          return {};
        }
        const next = {};
        Object.values(prev).forEach((entry) => {
          if (remainingMoveIds.has(entry.itemId)) {
            next[entry.itemId] = entry;
          }
        });
        return next;
      });

      setPendingDeletes((prev) => {
        if (remainingDeleteIds.size === 0) {
          return {};
        }
        const next = {};
        Object.values(prev).forEach((entry) => {
          if (remainingDeleteIds.has(entry.itemId)) {
            next[entry.itemId] = entry;
          }
        });
        return next;
      });

      setIsApplying(false);

      if (!hadErrors) {
        await fetchLists();
        setApplyModalOpen(false);
        addToast("Changes applied successfully.");
        if (
          showPendingOnly &&
          remainingMoveIds.size === 0 &&
          remainingDeleteIds.size === 0
        ) {
          setShowPendingOnly(false);
        }
      } else {
        addToast("Some changes failed. Review and try again.");
      }

      return { hadErrors };
    },
    [updateStepStatus, fetchLists, addToast, showPendingOnly],
  );

  const handleApply = useCallback(async () => {
    if (isApplying) {
      return;
    }
    if (!data.masterList) {
      return;
    }

    const moveEntries = Object.values(pendingMoves);
    const deleteEntries = Object.values(pendingDeletes);

    if (moveEntries.length === 0 && deleteEntries.length === 0) {
      return;
    }

    const steps = [
      ...moveEntries.map((entry) => ({
        key: `move-${entry.itemId}`,
        type: "move",
        status: "pending",
        itemId: entry.itemId,
        itemName: entry.itemName,
        targetCategoryId: entry.targetCategoryId,
        targetCategoryName: entry.targetCategoryName,
      })),
      ...deleteEntries.map((entry) => ({
        key: `delete-${entry.itemId}`,
        type: "delete",
        status: "pending",
        itemId: entry.itemId,
        itemName: entry.itemName,
      })),
    ];

    setApplySteps(steps);
    setApplyModalOpen(true);
  }, [isApplying, data.masterList, pendingMoves, pendingDeletes]);

  const handleConfirmApply = useCallback(async () => {
    if (isApplying || !data.masterList) {
      return;
    }

    const moveEntries = Object.values(pendingMoves);
    const deleteEntries = Object.values(pendingDeletes);

    if (moveEntries.length === 0 && deleteEntries.length === 0) {
      return;
    }

    setIsApplying(true);
    await performOperations(data.masterList.id, moveEntries, deleteEntries);
  }, [
    isApplying,
    data.masterList,
    pendingMoves,
    pendingDeletes,
    performOperations,
  ]);

  const handleRemoveStep = useCallback(
    (step) => {
      if (isApplying) {
        return;
      }

      if (step.type === "move") {
        setPendingMoves((prev) => {
          const next = { ...prev };
          delete next[step.itemId];
          return next;
        });
      } else {
        setPendingDeletes((prev) => {
          const next = { ...prev };
          delete next[step.itemId];
          return next;
        });
      }

      setApplySteps((prev) => prev.filter((s) => s.key !== step.key));

      if (applySteps.length <= 1) {
        setApplyModalOpen(false);
      }
    },
    [isApplying, applySteps.length],
  );

  const handleCloseModal = useCallback(() => {
    if (isApplying) {
      return;
    }
    setApplyModalOpen(false);
  }, [isApplying]);

  const handleTogglePendingFilter = useCallback(() => {
    setShowPendingOnly((prev) => {
      const newValue = !prev;
      if (newValue && filterCategories.size > 0) {
        // Clear category filters when enabling pending filter
        setFilterCategories(new Set());
      }
      return newValue;
    });
  }, [filterCategories.size]);

  const handleClearAllFilters = useCallback(() => {
    setFilterCategories(new Set());
  }, []);

  const handleOpenRename = useCallback((type, id, currentName) => {
    setRenameTarget({ type, id, currentName });
    setRenameValue(currentName);
    setRenameModalOpen(true);
  }, []);

  const handleCloseRenameModal = useCallback(() => {
    if (isRenaming) return;
    setRenameModalOpen(false);
    setRenameTarget(null);
    setRenameValue("");
    setIsRenaming(false);
  }, [isRenaming]);

  const handleSubmitRename = useCallback(
    async (event) => {
      event.preventDefault();
      if (!renameTarget || !renameValue.trim() || isRenaming) {
        return;
      }

      const trimmedValue = renameValue.trim();
      if (trimmedValue === renameTarget.currentName) {
        handleCloseRenameModal();
        return;
      }

      setIsRenaming(true);
      try {
        let endpoint, body;

        if (renameTarget.type === "category") {
          endpoint = "/api/master/rename-category";
          body = { categoryId: renameTarget.id, newName: trimmedValue };
        } else {
          endpoint = "/api/master/rename-item";
          body = { itemId: renameTarget.id, newName: trimmedValue };
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Rename failed");
        }

        addToast(`Renamed to "${trimmedValue}"`);

        // Reload data
        const listsResponse = await fetch("/api/lists");
        if (listsResponse.ok) {
          const payload = await listsResponse.json();
          if (payload.masterList) {
            setData((prev) => ({ ...prev, masterList: payload.masterList }));
          }
        }

        handleCloseRenameModal();
      } catch (error) {
        console.error("Rename error:", error);
        addToast(error.message || "Rename failed");
      } finally {
        setIsRenaming(false);
      }
    },
    [
      renameTarget,
      renameValue,
      isRenaming,
      data.masterList,
      addToast,
      handleCloseRenameModal,
    ],
  );

  const handleOpenCreateCategory = useCallback(() => {
    setNewCategoryName("");
    setCreateCategoryModalOpen(true);
  }, []);

  const handleCloseCreateCategoryModal = useCallback(() => {
    if (isCreatingCategory) return;
    setCreateCategoryModalOpen(false);
    setNewCategoryName("");
    setIsCreatingCategory(false);
  }, [isCreatingCategory]);

  const handleSubmitCreateCategory = useCallback(
    async (event) => {
      event.preventDefault();
      if (!newCategoryName.trim() || isCreatingCategory) {
        return;
      }

      setIsCreatingCategory(true);
      try {
        const response = await fetch("/api/master/create-category", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newCategoryName.trim() }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Create category failed");
        }

        addToast(`Category "${newCategoryName.trim()}" created`);

        // Reload data
        const listsResponse = await fetch("/api/lists");
        if (listsResponse.ok) {
          const payload = await listsResponse.json();
          if (payload.masterList) {
            setData((prev) => ({ ...prev, masterList: payload.masterList }));
          }
        }

        handleCloseCreateCategoryModal();
      } catch (error) {
        console.error("Create category error:", error);
        addToast(error.message || "Create category failed");
      } finally {
        setIsCreatingCategory(false);
      }
    },
    [
      newCategoryName,
      isCreatingCategory,
      addToast,
      handleCloseCreateCategoryModal,
    ],
  );

  const handleDeleteCategory = useCallback(
    async (categoryId, categoryName) => {
      if (isApplying) {
        return;
      }

      if (
        !confirm(
          `Delete category "${categoryName}"? Items in this category will become uncategorized.`,
        )
      ) {
        return;
      }

      try {
        const response = await fetch("/api/master/delete-category", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Delete category failed");
        }

        addToast(`Category "${categoryName}" deleted`);

        // Reload data
        const listsResponse = await fetch("/api/lists");
        if (listsResponse.ok) {
          const payload = await listsResponse.json();
          if (payload.masterList) {
            setData((prev) => ({ ...prev, masterList: payload.masterList }));
          }
        }
      } catch (error) {
        console.error("Delete category error:", error);
        addToast(error.message || "Delete category failed");
      }
    },
    [isApplying, addToast],
  );

  const masterSections = masterList?.sections || [];
  const masterUnavailable = !loading && !masterList;

  const filteredSections = useMemo(() => {
    if (showPendingOnly) {
      const pendingItemIds = new Set([
        ...Object.keys(pendingMoves),
        ...Object.keys(pendingDeletes),
      ]);

      if (pendingItemIds.size === 0) {
        return [];
      }

      return masterSections
        .map((section) => {
          const filteredItems = section.items.filter((item) =>
            pendingItemIds.has(item.id),
          );
          if (filteredItems.length === 0) {
            return null;
          }
          return {
            ...section,
            items: filteredItems,
          };
        })
        .filter(Boolean);
    }

    if (filterCategories.size === 0) {
      return masterSections;
    }
    return masterSections.filter((section) => {
      const categoryId = normalizeCategoryId(section.id);
      return filterCategories.has(categoryId);
    });
  }, [
    filterCategories,
    masterSections,
    showPendingOnly,
    pendingMoves,
    pendingDeletes,
  ]);

  const filteredItemCount = useMemo(() => {
    if (!filteredSections || filteredSections.length === 0) {
      return 0;
    }
    return filteredSections.reduce((count, section) => {
      return count + (section.items?.length || 0);
    }, 0);
  }, [filteredSections]);

  const totalItemCount = masterList?.itemCount || 0;

  const itemCountText = useMemo(() => {
    if (showPendingOnly) {
      const pendingCount =
        Object.keys(pendingMoves).length + Object.keys(pendingDeletes).length;
      return `Showing ${pendingCount} pending ${pendingCount === 1 ? "change" : "changes"} of ${totalItemCount} items`;
    }
    if (filterCategories.size > 0) {
      return `Filtered out ${filteredItemCount} of ${totalItemCount} items`;
    }
    return `${totalItemCount} items`;
  }, [
    showPendingOnly,
    pendingMoves,
    pendingDeletes,
    filterCategories.size,
    filteredItemCount,
    totalItemCount,
  ]);

  const listsView = React.createElement(
    React.Fragment,
    null,
    React.createElement("h1", null, "OurGroceries Overview"),
    status && React.createElement("p", { className: "status" }, status),
    React.createElement(
      "section",
      { className: "shopping-section" },
      React.createElement("h2", null, "Shopping Lists"),
      React.createElement(
        "ul",
        { className: "lists" },
        data.lists.map((entry) =>
          React.createElement(
            "li",
            { key: entry.id || entry.name },
            entry.name,
          ),
        ),
      ),
    ),
    data.masterList &&
      React.createElement(
        "button",
        {
          className: "primary-btn",
          type: "button",
          onClick: () => {
            window.location.hash = HASH_MASTER;
          },
        },
        `View ${data.masterList.name || "Master List"} (${data.masterList.itemCount} items)`,
      ),
  );

  let masterContent;
  if (loading) {
    masterContent = React.createElement(
      "p",
      { className: "status" },
      "Loading master list…",
    );
  } else if (masterUnavailable) {
    masterContent = React.createElement(
      "p",
      { className: "status" },
      status || "Master list unavailable.",
    );
  } else if (filteredSections.length === 0) {
    const isFilterActive = filterCategories.size > 0;
    const message = showPendingOnly
      ? "No items selected for move or deletion."
      : isFilterActive
        ? "No items match the selected filters."
        : "No items in master list.";
    masterContent = React.createElement("p", { className: "status" }, message);
  } else {
    masterContent = filteredSections.map((section) =>
      React.createElement(
        "div",
        { className: "category-block", key: section.id || section.name },
        React.createElement(
          "h2",
          { className: "category-header" },
          React.createElement(
            "span",
            { className: "category-name" },
            section.name,
          ),
          React.createElement(
            "button",
            {
              type: "button",
              className: "category-rename-btn",
              "aria-label": "Rename category",
              onClick: (event) => {
                event.stopPropagation();
                handleOpenRename("category", section.id, section.name);
              },
              disabled: isApplying,
            },
            React.createElement(PenIcon, null),
          ),
          section.id !== "uncategorized" &&
            React.createElement(
              "button",
              {
                type: "button",
                className: "category-delete-btn",
                "aria-label": "Delete category",
                onClick: (event) => {
                  event.stopPropagation();
                  handleDeleteCategory(section.id, section.name);
                },
                disabled: isApplying,
              },
              React.createElement(TrashIcon, null),
            ),
        ),
        React.createElement(
          "ul",
          { className: "category-items" },
          section.items.map((item) => {
            const pendingMove = pendingMoves[item.id];
            const pendingDelete = Boolean(pendingDeletes[item.id]);
            const moveColor = pendingMove
              ? categoryColorMap[pendingMove.targetCategoryId]
              : null;
            const itemClasses = [
              "category-item",
              pendingMove ? "pending-move" : "",
              pendingDelete ? "pending-delete" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return React.createElement(
              "li",
              {
                key: item.id || item.name,
                className: itemClasses,
                style: pendingMove
                  ? { "--pending-color": moveColor }
                  : undefined,
              },
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "item-main",
                  onClick: () => handleToggleMove(item),
                  disabled: isApplying,
                },
                React.createElement(
                  "span",
                  { className: "item-name" },
                  item.name,
                ),
                pendingMove &&
                  React.createElement(
                    "span",
                    {
                      className: "item-tag",
                      style: { backgroundColor: moveColor || "#e5e7eb" },
                    },
                    `Move to ${pendingMove.targetCategoryName}`,
                  ),
                pendingDelete &&
                  React.createElement(
                    "span",
                    { className: "item-tag delete" },
                    "Delete",
                  ),
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "item-rename",
                  "aria-label": "Rename item",
                  onClick: (event) => {
                    event.stopPropagation();
                    handleOpenRename("item", item.id, item.name);
                  },
                  disabled: isApplying,
                },
                React.createElement(PenIcon, null),
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "item-trash",
                  "aria-label": pendingDelete
                    ? "Undo delete"
                    : "Mark for deletion",
                  onClick: (event) => {
                    event.stopPropagation();
                    handleToggleDelete(item);
                  },
                  disabled: isApplying,
                },
                React.createElement(TrashIcon, null),
              ),
            );
          }),
        ),
      ),
    );
  }

  const categorySidebar = React.createElement(
    "aside",
    { className: "category-sidebar" },
    !loading &&
      React.createElement(
        React.Fragment,
        null,
        React.createElement("h3", null, "Select Target Category"),
        React.createElement(
          "p",
          { className: "category-sidebar-description" },
          "Click an item on the left, then click a category here to tag it for moving. Use the filter icon to show only that category.",
        ),
        showPendingOnly &&
          React.createElement(
            "p",
            { className: "category-filters-disabled-notice" },
            "Filtering by category is disabled while showing pending changes",
          ),
        filterCategories.size > 0 &&
          React.createElement(
            "button",
            {
              type: "button",
              className: "clear-filters-btn",
              onClick: handleClearAllFilters,
            },
            "Clear all filters",
          ),
      ),
    React.createElement(
      "ul",
      { className: "category-list", ref: categoryListRef },
      sortedCategoryList.map((category, index) => {
        const color = categoryColorMap[category.id];
        const isSelected = category.id === selectedCategoryId;
        const isFiltered = filterCategories.has(category.id);
        return React.createElement(
          "li",
          {
            key: category.id,
            className: `category-list-item${isFiltered ? " filtered" : ""}`,
            "data-category-id": category.id,
          },
          React.createElement(
            "button",
            {
              type: "button",
              className: `category-chip${isSelected ? " selected" : ""}`,
              style: { backgroundColor: color },
              onClick: () => handleSelectCategory(category.id),
              disabled: isApplying,
            },
            category.name,
          ),
          React.createElement(
            "button",
            {
              type: "button",
              className: `category-filter-btn${isFiltered ? " active" : ""}`,
              "aria-label": isFiltered
                ? "Remove filter"
                : "Filter by this category",
              onClick: (event) => {
                event.stopPropagation();
                setFilterCategories((prev) => {
                  const next = new Set(prev);
                  if (next.has(category.id)) {
                    next.delete(category.id);
                  } else {
                    next.add(category.id);
                  }
                  return next;
                });
              },
              disabled: isApplying || showPendingOnly,
            },
            React.createElement(FilterIcon, null),
          ),
        );
      }),
    ),
  );

  const masterBody = React.createElement(
    "div",
    { className: "master-layout" },
    React.createElement("div", { className: "master-content" }, masterContent),
    categorySidebar,
  );

  const masterView = React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "button",
      {
        className: "secondary-btn",
        type: "button",
        onClick: () => {
          window.location.hash = HASH_LISTS;
        },
      },
      "← Back to Shopping Lists",
    ),
    React.createElement(
      "section",
      { className: "master-section" },
      React.createElement(
        "header",
        { className: "master-header" },
        React.createElement(
          "div",
          { className: "master-title-row" },
          React.createElement(
            "div",
            { className: "master-title-container" },
            React.createElement(
              "h1",
              null,
              data.masterList?.name || "Master List",
            ),
            !loading &&
              React.createElement(
                "div",
                { className: "master-item-count" },
                itemCountText,
              ),
          ),
          !loading &&
            React.createElement(
              "button",
              {
                type: "button",
                className: `filter-btn${showPendingOnly ? " active" : ""}`,
                onClick: handleTogglePendingFilter,
                disabled:
                  Object.keys(pendingMoves).length === 0 &&
                  Object.keys(pendingDeletes).length === 0,
                title: showPendingOnly
                  ? "Show all items"
                  : "Show only items selected for move/deletion",
              },
              showPendingOnly
                ? "✓ Show pending changes"
                : "Show pending changes",
            ),
          !loading &&
            React.createElement(
              "button",
              {
                type: "button",
                className: "filter-btn",
                onClick: handleOpenCreateCategory,
                disabled: isApplying,
                title: "Add a new category",
              },
              "Add Category",
            ),
        ),
      ),
      masterBody,
    ),
  );

  const toastElements =
    toasts.length > 0
      ? React.createElement(
          "div",
          { className: "toast-container" },
          toasts.map((toast) =>
            React.createElement(
              "div",
              { key: toast.id, className: "toast" },
              toast.message,
            ),
          ),
        )
      : null;

  const applyButton =
    view === "master" && hasPendingChanges
      ? React.createElement(
          "button",
          {
            type: "button",
            className: "apply-floating-btn",
            onClick: handleApply,
            disabled: isApplying,
          },
          isApplying ? "Applying…" : "Apply changes",
        )
      : null;

  const applyModal = applyModalOpen
    ? React.createElement(
        "div",
        { className: "apply-modal-backdrop" },
        React.createElement(
          "div",
          { className: "apply-modal" },
          React.createElement(
            "h2",
            null,
            isApplying ? "Applying changes…" : "Changes summary",
          ),
          !isApplying &&
            React.createElement(
              "div",
              { className: "apply-summary-counts" },
              `${Object.keys(pendingMoves).length} move${Object.keys(pendingMoves).length !== 1 ? "s" : ""}, ${Object.keys(pendingDeletes).length} delete${Object.keys(pendingDeletes).length !== 1 ? "s" : ""}`,
            ),
          React.createElement(
            "ul",
            { className: "apply-progress-list" },
            applySteps.map((step) =>
              React.createElement(
                "li",
                {
                  key: step.key,
                  className: `status-${step.status}`,
                },
                React.createElement(
                  "div",
                  { className: "apply-progress-content" },
                  React.createElement(
                    "div",
                    { className: "apply-progress-text" },
                    step.type === "move"
                      ? `Move "${step.itemName}" to ${step.targetCategoryName}`
                      : `Delete "${step.itemName}"`,
                  ),
                  React.createElement(
                    "span",
                    { className: "apply-status-label" },
                    step.status === "pending"
                      ? "Pending"
                      : step.status === "running"
                        ? "In progress"
                        : step.status === "success"
                          ? "Done"
                          : "Failed",
                  ),
                  step.status === "error" && step.errorMessage
                    ? React.createElement(
                        "p",
                        { className: "apply-error" },
                        step.errorMessage,
                      )
                    : null,
                ),
                !isApplying &&
                  step.status === "pending" &&
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      className: "remove-step-btn",
                      onClick: () => handleRemoveStep(step),
                      "aria-label": "Remove",
                    },
                    "×",
                  ),
              ),
            ),
          ),
          React.createElement(
            "div",
            { className: "apply-modal-actions" },
            !isApplying && applySteps.every((s) => s.status === "pending")
              ? React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      className: "secondary-btn",
                      onClick: handleCloseModal,
                    },
                    "Cancel",
                  ),
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      className: "primary-btn",
                      onClick: handleConfirmApply,
                    },
                    "Confirm & Apply",
                  ),
                )
              : null,
            (isApplying ||
              applySteps.some(
                (s) => s.status === "success" || s.status === "error",
              )) &&
              applySteps.every(
                (s) => s.status === "success" || s.status === "error",
              ) &&
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "primary-btn",
                  onClick: handleCloseModal,
                },
                "Close",
              ),
          ),
        ),
      )
    : null;

  const renameModal =
    renameModalOpen && renameTarget
      ? React.createElement(
          "div",
          { className: "apply-modal-backdrop" },
          React.createElement(
            "div",
            { className: "rename-modal" },
            React.createElement(
              "h2",
              null,
              renameTarget.type === "category"
                ? "Rename Category"
                : "Rename Item",
            ),
            React.createElement(
              "form",
              { onSubmit: handleSubmitRename },
              React.createElement(
                "div",
                { className: "rename-form-group" },
                React.createElement(
                  "label",
                  { htmlFor: "rename-input" },
                  "New name:",
                ),
                React.createElement("input", {
                  id: "rename-input",
                  type: "text",
                  className: "rename-input",
                  value: renameValue,
                  onChange: (e) => setRenameValue(e.target.value),
                  autoFocus: true,
                  required: true,
                  disabled: isRenaming,
                }),
              ),
              React.createElement(
                "div",
                { className: "rename-modal-actions" },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    className: "secondary-btn",
                    onClick: handleCloseRenameModal,
                    disabled: isRenaming,
                  },
                  "Cancel",
                ),
                React.createElement(
                  "button",
                  {
                    type: "submit",
                    className: "primary-btn",
                    disabled:
                      isRenaming ||
                      !renameValue.trim() ||
                      renameValue.trim() === renameTarget.currentName,
                  },
                  isRenaming ? "Renaming…" : "Rename",
                ),
              ),
            ),
          ),
        )
      : null;

  const createCategoryModal = createCategoryModalOpen
    ? React.createElement(
        "div",
        { className: "apply-modal-backdrop" },
        React.createElement(
          "div",
          { className: "rename-modal" },
          React.createElement("h2", null, "Create Category"),
          React.createElement(
            "form",
            { onSubmit: handleSubmitCreateCategory },
            React.createElement(
              "div",
              { className: "rename-form-group" },
              React.createElement(
                "label",
                { htmlFor: "create-category-input" },
                "Category name:",
              ),
              React.createElement("input", {
                id: "create-category-input",
                type: "text",
                className: "rename-input",
                value: newCategoryName,
                onChange: (e) => setNewCategoryName(e.target.value),
                autoFocus: true,
                required: true,
                disabled: isCreatingCategory,
              }),
            ),
            React.createElement(
              "div",
              { className: "rename-modal-actions" },
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "secondary-btn",
                  onClick: handleCloseCreateCategoryModal,
                  disabled: isCreatingCategory,
                },
                "Cancel",
              ),
              React.createElement(
                "button",
                {
                  type: "submit",
                  className: "primary-btn",
                  disabled: isCreatingCategory || !newCategoryName.trim(),
                },
                isCreatingCategory ? "Creating…" : "Create",
              ),
            ),
          ),
        ),
      )
    : null;

  return React.createElement(
    React.Fragment,
    null,
    toastElements,
    applyModal,
    renameModal,
    createCategoryModal,
    React.createElement(
      "main",
      { className: "container" },
      view === "master" ? masterView : listsView,
      applyButton,
    ),
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
