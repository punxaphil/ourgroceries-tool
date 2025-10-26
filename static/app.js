const { useCallback, useEffect, useMemo, useRef, useState } = React;

const HASH_MASTER = '#/master';
const HASH_LISTS = '#/lists';
const PENDING_OPERATIONS_KEY = 'master-pending-operations';
const FILTER_STATE_KEY = 'master-filter-state';
const PENDING_FILTER_KEY = 'master-pending-filter';

const CATEGORY_COLORS = [
    '#fde68a',
    '#bbf7d0',
    '#bfdbfe',
    '#fbcfe8',
    '#ede9fe',
    '#fee2e2',
    '#dcfce7',
    '#e0f2fe',
];

const resolveViewFromHash = (hash) => (hash === HASH_MASTER ? 'master' : 'lists');

const normalizeCategoryId = (categoryId) => (categoryId === null || categoryId === undefined || categoryId === '' ? 'uncategorized' : categoryId);

const denormalizeCategoryId = (categoryId) => (categoryId === 'uncategorized' ? null : categoryId);

const buildItemLookup = (masterList) => {
    const lookup = new Map();
    if (!masterList) {
        return lookup;
    }
    const sections = Array.isArray(masterList.sections) ? masterList.sections : [];
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
        'svg',
        {
            width: '14',
            height: '16',
            viewBox: '0 0 14 16',
            fill: 'none',
            xmlns: 'http://www.w3.org/2000/svg',
            'aria-hidden': 'true',
        },
        React.createElement('path', {
            d: 'M2.75 4.75h8.5l-.57 8.05a1.5 1.5 0 0 1-1.49 1.38H4.81a1.5 1.5 0 0 1-1.49-1.38L2.75 4.75Zm2.5-2.5h3.5l.5 1.5h-4.5l.5-1.5Zm-3 1.5h10',
            stroke: 'currentColor',
            strokeWidth: '1.4',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
        }),
        React.createElement('path', {
            d: 'M6 7v4.25',
            stroke: 'currentColor',
            strokeWidth: '1.4',
            strokeLinecap: 'round',
        }),
        React.createElement('path', {
            d: 'M8 7v4.25',
            stroke: 'currentColor',
            strokeWidth: '1.4',
            strokeLinecap: 'round',
        })
    );

function App() {
    const [data, setData] = useState({ lists: [], masterList: null });
    const [status, setStatus] = useState('Loading lists…');
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
            console.error('Failed to load filter state:', error);
        }
        return new Set();
    });
    const [isFilterActive, setIsFilterActive] = useState(() => {
        try {
            const stored = window.localStorage.getItem(FILTER_STATE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.isActive || false;
            }
        } catch (error) {
            console.error('Failed to load filter state:', error);
        }
        return false;
    });
    const [showPendingOnly, setShowPendingOnly] = useState(() => {
        try {
            const stored = window.localStorage.getItem(PENDING_FILTER_KEY);
            if (stored) {
                return JSON.parse(stored) || false;
            }
        } catch (error) {
            console.error('Failed to load pending filter state:', error);
        }
        return false;
    });
    const [toasts, setToasts] = useState([]);
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [applySteps, setApplySteps] = useState([]);
    const [isApplying, setIsApplying] = useState(false);
    const toastTimeouts = useRef(new Map());
    const hasLoadedPendingRef = useRef(false);

    const addToast = useCallback((message) => {
        const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        setToasts((current) => [...current, { id, message }]);
        const timeoutId = window.setTimeout(() => {
            setToasts((current) => current.filter((toast) => toast.id !== id));
            toastTimeouts.current.delete(id);
        }, 2800);
        toastTimeouts.current.set(id, timeoutId);
    }, []);

    useEffect(() => () => {
        toastTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
        toastTimeouts.current.clear();
    }, []);

    useEffect(() => {
        if (!window.location.hash) {
            window.location.hash = HASH_LISTS;
        }
    }, []);

    const fetchLists = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/lists');
            if (!response.ok) {
                throw new Error(`Request failed with ${response.status}`);
            }
            const payload = await response.json();
            const lists = Array.isArray(payload.lists) ? payload.lists : [];
            const masterList = payload.masterList || null;
            setData({ lists, masterList });
            if (lists.length === 0 && (!masterList || masterList.itemCount === 0)) {
                setStatus('No lists found.');
            } else {
                setStatus(null);
            }
        } catch (error) {
            console.error(error);
            setStatus('Unable to load lists. Check credentials and try again.');
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
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const masterList = data.masterList;
    const itemLookup = useMemo(() => buildItemLookup(masterList), [masterList]);

    const categoryList = useMemo(() => {
        if (!masterList) {
            return [];
        }
        const sections = Array.isArray(masterList.sections) ? masterList.sections : [];
        return sections.map((section) => ({
            id: normalizeCategoryId(section.id),
            name: section.name || 'Uncategorized',
        }));
    }, [masterList]);

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
                const storedDeletes = Array.isArray(parsed?.deletes) ? parsed.deletes : [];

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
                        targetCategoryName: categoryNameLookup.get(targetId) || entry.targetCategoryName || 'Uncategorized',
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
                if (Object.keys(nextMoves).length === 0 && Object.keys(nextDeletes).length === 0) {
                    setShowPendingOnly(false);
                }
            } catch (error) {
                console.error('Unable to restore pending operations:', error);
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
                const targetName = categoryNameLookup.get(targetId) || move.targetCategoryName || 'Uncategorized';
                const updated = {
                    itemId: move.itemId,
                    itemName: item.name,
                    targetCategoryId: targetId,
                    targetCategoryName: targetName,
                };
                next[move.itemId] = updated;
                if (!mutated && (
                    item.name !== move.itemName ||
                    targetId !== move.targetCategoryId ||
                    targetName !== move.targetCategoryName
                )) {
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
        window.localStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(payload));
    }, [pendingMoves, pendingDeletes]);

    useEffect(() => {
        const payload = {
            categories: Array.from(filterCategories),
            isActive: isFilterActive,
        };
        window.localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(payload));
    }, [filterCategories, isFilterActive]);

    useEffect(() => {
        window.localStorage.setItem(PENDING_FILTER_KEY, JSON.stringify(showPendingOnly));
    }, [showPendingOnly]);

    const handleSelectCategory = useCallback(
        (categoryId) => {
            if (isApplying) {
                return;
            }
            setSelectedCategoryId(categoryId);
        },
        [isApplying]
    );

    const handleToggleMove = useCallback(
        (item) => {
            if (isApplying) {
                return;
            }
            if (!selectedCategoryId) {
                addToast('Select a category before tagging items.');
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
                    addToast('Item is already in that category.');
                    return prev;
                }

                if (existing && existing.targetCategoryId === normalizedTarget) {
                    const next = { ...prev };
                    delete next[item.id];
                    return next;
                }

                const targetName = categoryNameLookup.get(normalizedTarget) || 'Uncategorized';
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
        [isApplying, selectedCategoryId, categoryNameLookup, addToast]
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
        [isApplying]
    );

    const hasPendingChanges = useMemo(
        () => Object.keys(pendingMoves).length > 0 || Object.keys(pendingDeletes).length > 0,
        [pendingMoves, pendingDeletes]
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
                    : step
            )
        );
    }, []);

    const performOperations = useCallback(
        async (listId, moveEntries, deleteEntries) => {
            const remainingMoveIds = new Set(moveEntries.map((entry) => entry.itemId));
            const remainingDeleteIds = new Set(deleteEntries.map((entry) => entry.itemId));

            let hadErrors = false;

            const steps = [
                ...moveEntries.map((entry) => ({
                    key: `move-${entry.itemId}`,
                    type: 'move',
                    status: 'pending',
                    itemId: entry.itemId,
                    itemName: entry.itemName,
                    targetCategoryId: entry.targetCategoryId,
                    targetCategoryName: entry.targetCategoryName,
                })),
                ...deleteEntries.map((entry) => ({
                    key: `delete-${entry.itemId}`,
                    type: 'delete',
                    status: 'pending',
                    itemId: entry.itemId,
                    itemName: entry.itemName,
                })),
            ];

            for (let index = 0; index < steps.length; index += 1) {
                const step = steps[index];
                updateStepStatus(index, 'running');

                try {
                    if (step.type === 'move') {
                        const response = await fetch('/api/master/move', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                list_id: listId,
                                items: [{ item_id: step.itemId, item_name: step.itemName }],
                                target_category_id: denormalizeCategoryId(step.targetCategoryId),
                            }),
                        });

                        if (!response.ok) {
                            const message = await response.text();
                            throw new Error(message || 'Request failed');
                        }

                        const payload = await response.json();
                        const masterList = payload.masterList || null;
                        if (masterList) {
                            setData((prev) => ({ ...prev, masterList }));
                        }
                        remainingMoveIds.delete(step.itemId);
                    } else {
                        const response = await fetch('/api/master/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                list_id: listId,
                                item_ids: [step.itemId],
                            }),
                        });

                        if (!response.ok) {
                            const message = await response.text();
                            throw new Error(message || 'Request failed');
                        }

                        const payload = await response.json();
                        const masterList = payload.masterList || null;
                        if (masterList) {
                            setData((prev) => ({ ...prev, masterList }));
                        }
                        remainingDeleteIds.delete(step.itemId);
                    }

                    updateStepStatus(index, 'success');
                } catch (error) {
                    console.error(error);
                    hadErrors = true;
                    const message = error instanceof Error ? error.message : 'Request failed';
                    updateStepStatus(index, 'error', message);
                }
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
                addToast('Changes applied successfully.');
                if (showPendingOnly && remainingMoveIds.size === 0 && remainingDeleteIds.size === 0) {
                    setShowPendingOnly(false);
                }
            } else {
                addToast('Some changes failed. Review and try again.');
            }

            return { hadErrors };
        },
        [updateStepStatus, fetchLists, addToast, showPendingOnly]
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
                type: 'move',
                status: 'pending',
                itemId: entry.itemId,
                itemName: entry.itemName,
                targetCategoryId: entry.targetCategoryId,
                targetCategoryName: entry.targetCategoryName,
            })),
            ...deleteEntries.map((entry) => ({
                key: `delete-${entry.itemId}`,
                type: 'delete',
                status: 'pending',
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
    }, [isApplying, data.masterList, pendingMoves, pendingDeletes, performOperations]);

    const handleRemoveStep = useCallback((step) => {
        if (isApplying) {
            return;
        }

        if (step.type === 'move') {
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
    }, [isApplying, applySteps.length]);

    const handleCloseModal = useCallback(() => {
        if (isApplying) {
            return;
        }
        setApplyModalOpen(false);
    }, [isApplying]);

    const handleToggleFilter = useCallback(() => {
        setIsFilterActive((prev) => !prev);
        if (showPendingOnly) {
            setShowPendingOnly(false);
        }
    }, [showPendingOnly]);

    const handleTogglePendingFilter = useCallback(() => {
        setShowPendingOnly((prev) => !prev);
        if (isFilterActive) {
            setIsFilterActive(false);
        }
    }, [isFilterActive]);

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
                    const filteredItems = section.items.filter((item) => pendingItemIds.has(item.id));
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

        if (!isFilterActive || filterCategories.size === 0) {
            return masterSections;
        }
        return masterSections.filter((section) => {
            const categoryId = normalizeCategoryId(section.id);
            return filterCategories.has(categoryId);
        });
    }, [isFilterActive, filterCategories, masterSections, showPendingOnly, pendingMoves, pendingDeletes]);

    const listsView = React.createElement(
        React.Fragment,
        null,
        React.createElement('h1', null, 'OurGroceries Overview'),
        status && React.createElement('p', { className: 'status' }, status),
        React.createElement(
            'section',
            { className: 'shopping-section' },
            React.createElement('h2', null, 'Shopping Lists'),
            React.createElement(
                'ul',
                { className: 'lists' },
                data.lists.map((entry) =>
                    React.createElement('li', { key: entry.id || entry.name }, entry.name)
                )
            )
        ),
        data.masterList &&
        React.createElement(
            'button',
            {
                className: 'primary-btn',
                type: 'button',
                onClick: () => {
                    window.location.hash = HASH_MASTER;
                },
            },
            `View ${data.masterList.name || 'Master List'} (${data.masterList.itemCount} items)`
        )
    );

    let masterContent;
    if (loading) {
        masterContent = React.createElement('p', { className: 'status' }, 'Loading master list…');
    } else if (masterUnavailable) {
        masterContent = React.createElement('p', { className: 'status' }, status || 'Master list unavailable.');
    } else if (filteredSections.length === 0) {
        const message = showPendingOnly
            ? 'No items selected for move or deletion.'
            : isFilterActive
                ? 'No items match the selected filters.'
                : 'No items in master list.';
        masterContent = React.createElement('p', { className: 'status' }, message);
    } else {
        masterContent = filteredSections.map((section) =>
            React.createElement(
                'div',
                { className: 'category-block', key: section.id || section.name },
                React.createElement('h2', null, section.name),
                React.createElement(
                    'ul',
                    { className: 'category-items' },
                    section.items.map((item) => {
                        const pendingMove = pendingMoves[item.id];
                        const pendingDelete = Boolean(pendingDeletes[item.id]);
                        const moveColor = pendingMove ? categoryColorMap[pendingMove.targetCategoryId] : null;
                        const itemClasses = [
                            'category-item',
                            pendingMove ? 'pending-move' : '',
                            pendingDelete ? 'pending-delete' : '',
                        ]
                            .filter(Boolean)
                            .join(' ');

                        return React.createElement(
                            'li',
                            {
                                key: item.id || item.name,
                                className: itemClasses,
                                style: pendingMove ? { '--pending-color': moveColor } : undefined,
                            },
                            React.createElement(
                                'button',
                                {
                                    type: 'button',
                                    className: 'item-main',
                                    onClick: () => handleToggleMove(item),
                                    disabled: isApplying,
                                },
                                React.createElement('span', { className: 'item-name' }, item.name),
                                pendingMove &&
                                React.createElement(
                                    'span',
                                    {
                                        className: 'item-tag',
                                        style: { backgroundColor: moveColor || '#e5e7eb' },
                                    },
                                    `Move to ${pendingMove.targetCategoryName}`
                                ),
                                pendingDelete &&
                                React.createElement(
                                    'span',
                                    { className: 'item-tag delete' },
                                    'Delete'
                                )
                            ),
                            React.createElement(
                                'button',
                                {
                                    type: 'button',
                                    className: 'item-trash',
                                    'aria-label': pendingDelete ? 'Undo delete' : 'Mark for deletion',
                                    onClick: (event) => {
                                        event.stopPropagation();
                                        handleToggleDelete(item);
                                    },
                                    disabled: isApplying,
                                },
                                React.createElement(TrashIcon, null)
                            )
                        );
                    })
                )
            )
        );
    }

    const categorySidebar = React.createElement(
        'aside',
        { className: 'category-sidebar' },
        !loading && React.createElement('h3', null, 'Move to category'),
        React.createElement(
            'ul',
            { className: 'category-list' },
            categoryList.map((category) => {
                const color = categoryColorMap[category.id];
                const isSelected = category.id === selectedCategoryId;
                const isFiltered = filterCategories.has(category.id);
                return React.createElement(
                    'li',
                    { key: category.id },
                    React.createElement(
                        'button',
                        {
                            type: 'button',
                            className: `category-chip${isSelected ? ' selected' : ''}${isFiltered ? ' filtered' : ''}`,
                            style: { backgroundColor: color },
                            onClick: () => handleSelectCategory(category.id),
                            disabled: isApplying,
                            onDoubleClick: () => {
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
                        },
                        category.name
                    )
                );
            })
        )
    );

    const masterBody = React.createElement(
        'div',
        { className: 'master-layout' },
        React.createElement('div', { className: 'master-content' }, masterContent),
        categorySidebar
    );

    const masterView = React.createElement(
        React.Fragment,
        null,
        React.createElement(
            'button',
            {
                className: 'secondary-btn',
                type: 'button',
                onClick: () => {
                    window.location.hash = HASH_LISTS;
                },
            },
            '← Back to Shopping Lists'
        ),
        React.createElement(
            'section',
            { className: 'master-section' },
            React.createElement(
                'header',
                { className: 'master-header' },
                React.createElement(
                    'div',
                    { className: 'master-title-row' },
                    React.createElement(
                        'h1',
                        null,
                        loading
                            ? (data.masterList?.name || 'Master List')
                            : `${data.masterList?.name || 'Master List'} (${data.masterList?.itemCount || 0} items)`
                    ),
                    !loading && React.createElement(
                        'button',
                        {
                            type: 'button',
                            className: `filter-btn${isFilterActive ? ' active' : ''}`,
                            onClick: handleToggleFilter,
                            disabled: filterCategories.size === 0,
                            title: isFilterActive ? 'Hide filter' : 'Show only double-clicked categories',
                        },
                        isFilterActive ? '✓ Filter' : 'Filter'
                    ),
                    !loading && React.createElement(
                        'button',
                        {
                            type: 'button',
                            className: `filter-btn${showPendingOnly ? ' active' : ''}`,
                            onClick: handleTogglePendingFilter,
                            disabled: Object.keys(pendingMoves).length === 0 && Object.keys(pendingDeletes).length === 0,
                            title: showPendingOnly ? 'Show all items' : 'Show only items selected for move/deletion',
                        },
                        showPendingOnly ? '✓ Pending' : 'Pending'
                    )
                )
            ),
            masterBody
        )
    );

    const toastElements =
        toasts.length > 0
            ? React.createElement(
                'div',
                { className: 'toast-container' },
                toasts.map((toast) =>
                    React.createElement(
                        'div',
                        { key: toast.id, className: 'toast' },
                        toast.message
                    )
                )
            )
            : null;

    const applyButton = view === 'master' && hasPendingChanges
        ? React.createElement(
            'button',
            {
                type: 'button',
                className: 'apply-floating-btn',
                onClick: handleApply,
                disabled: isApplying,
            },
            isApplying ? 'Applying…' : 'Apply changes'
        )
        : null;

    const applyModal = applyModalOpen
        ? React.createElement(
            'div',
            { className: 'apply-modal-backdrop' },
            React.createElement(
                'div',
                { className: 'apply-modal' },
                React.createElement('h2', null, isApplying ? 'Applying changes…' : 'Changes summary'),
                !isApplying && React.createElement(
                    'div',
                    { className: 'apply-summary-counts' },
                    `${Object.keys(pendingMoves).length} move${Object.keys(pendingMoves).length !== 1 ? 's' : ''}, ${Object.keys(pendingDeletes).length} delete${Object.keys(pendingDeletes).length !== 1 ? 's' : ''}`
                ),
                React.createElement(
                    'ul',
                    { className: 'apply-progress-list' },
                    applySteps.map((step) =>
                        React.createElement(
                            'li',
                            {
                                key: step.key,
                                className: `status-${step.status}`,
                            },
                            React.createElement(
                                'div',
                                { className: 'apply-progress-content' },
                                React.createElement(
                                    'div',
                                    { className: 'apply-progress-text' },
                                    step.type === 'move'
                                        ? `Move "${step.itemName}" to ${step.targetCategoryName}`
                                        : `Delete "${step.itemName}"`
                                ),
                                React.createElement(
                                    'span',
                                    { className: 'apply-status-label' },
                                    step.status === 'pending'
                                        ? 'Pending'
                                        : step.status === 'running'
                                            ? 'In progress'
                                            : step.status === 'success'
                                                ? 'Done'
                                                : 'Failed'
                                ),
                                step.status === 'error' && step.errorMessage
                                    ? React.createElement('p', { className: 'apply-error' }, step.errorMessage)
                                    : null
                            ),
                            !isApplying && step.status === 'pending' &&
                            React.createElement(
                                'button',
                                {
                                    type: 'button',
                                    className: 'remove-step-btn',
                                    onClick: () => handleRemoveStep(step),
                                    'aria-label': 'Remove',
                                },
                                '×'
                            )
                        )
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'apply-modal-actions' },
                    !isApplying
                        ? React.createElement(
                            React.Fragment,
                            null,
                            React.createElement(
                                'button',
                                {
                                    type: 'button',
                                    className: 'secondary-btn',
                                    onClick: handleCloseModal,
                                },
                                'Cancel'
                            ),
                            React.createElement(
                                'button',
                                {
                                    type: 'button',
                                    className: 'primary-btn',
                                    onClick: handleConfirmApply,
                                },
                                'Confirm & Apply'
                            )
                        )
                        : null,
                    isApplying &&
                    applySteps.every((s) => s.status === 'success' || s.status === 'error') &&
                    React.createElement(
                        'button',
                        {
                            type: 'button',
                            className: 'primary-btn',
                            onClick: handleCloseModal,
                        },
                        'Close'
                    )
                )
            )
        )
        : null;

    return React.createElement(
        React.Fragment,
        null,
        toastElements,
        applyModal,
        React.createElement(
            'main',
            { className: 'container' },
            view === 'master' ? masterView : listsView,
            applyButton
        )
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
