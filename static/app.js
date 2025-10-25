const { useCallback, useEffect, useMemo, useRef, useState } = React;
const HASH_MASTER = '#/master';
const HASH_LISTS = '#/lists';
const MOVE_TARGET_STORAGE_KEY = 'lastMoveCategoryId';

const resolveViewFromHash = (hash) => (hash === HASH_MASTER ? 'master' : 'lists');

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

function App() {

const cloneMasterList = (masterList) => {
    if (!masterList) {
        return masterList;
    }
    return {
        ...masterList,
        sections: Array.isArray(masterList.sections)
            ? masterList.sections.map((section) => ({
                  ...section,
                  items: Array.isArray(section.items)
                      ? section.items.map((item) => ({ ...item }))
                      : [],
              }))
            : [],
    };
};

const buildOptimisticMasterList = (masterList, itemsToMove, targetCategoryId, targetCategoryName) => {
    const source = cloneMasterList(masterList);
    if (!source) {
        return source;
    }

    const movingIds = new Set(itemsToMove.map((item) => item.id));
    const normalizedTargetId = targetCategoryId ?? '';
    let targetSectionIndex = -1;

    const updatedSections = source.sections.map((section, index) => {
        const normalizedSectionId = section.id === 'uncategorized' ? '' : section.id;
        if (normalizedSectionId === normalizedTargetId) {
            targetSectionIndex = index;
        }
        const filteredItems = Array.isArray(section.items)
            ? section.items.filter((item) => !movingIds.has(item.id))
            : [];
        return {
            ...section,
            items: filteredItems,
        };
    });

    let targetSection;
    if (targetSectionIndex === -1) {
        targetSection = {
            id: normalizedTargetId === '' ? 'uncategorized' : targetCategoryId,
            name: targetCategoryName || 'Uncategorized',
            items: [],
        };
        updatedSections.push(targetSection);
        targetSectionIndex = updatedSections.length - 1;
    } else {
        targetSection = { ...updatedSections[targetSectionIndex] };
        updatedSections[targetSectionIndex] = targetSection;
    }

    const movedItems = itemsToMove.map((item) => ({
        ...item,
        categoryId: targetCategoryId ?? null,
    }));

    targetSection.items = [...(targetSection.items || []), ...movedItems];

    source.sections = updatedSections;
    return source;
};
    const [data, setData] = useState({ lists: [], masterList: null });
    const [status, setStatus] = useState('Loading lists…');
    const [view, setView] = useState(resolveViewFromHash(window.location.hash));
    const [loading, setLoading] = useState(true);
    const [selectedItemIds, setSelectedItemIds] = useState([]);
    const [moveTarget, setMoveTarget] = useState('');
    const [moving, setMoving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [moveError, setMoveError] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [hasLoadedStoredTarget, setHasLoadedStoredTarget] = useState(false);
    const toastTimeouts = useRef(new Map());

    const isBusy = moving || deleting;

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

    useEffect(() => {
        const stored = window.localStorage.getItem(MOVE_TARGET_STORAGE_KEY);
        if (stored !== null) {
            setMoveTarget(stored);
        }
        setHasLoadedStoredTarget(true);
    }, []);

    useEffect(() => {
        fetch('/api/lists')
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Request failed with ${response.status}`);
                }
                return response.json();
            })
            .then((payload) => {
                setLoading(false);
                const lists = Array.isArray(payload.lists) ? payload.lists : [];
                const masterList = payload.masterList || null;
                setData({ lists, masterList });
                if (lists.length === 0 && (!masterList || masterList.itemCount === 0)) {
                    setStatus('No lists found.');
                } else {
                    setStatus(null);
                }
            })
            .catch((error) => {
                console.error(error);
                setStatus('Unable to load lists. Check credentials and try again.');
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        const handleHashChange = () => {
            setView(resolveViewFromHash(window.location.hash));
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    useEffect(() => {
        if (view !== 'master') {
            setSelectedItemIds([]);
            setMoveError(null);
        }
    }, [view]);

    const itemLookup = useMemo(() => buildItemLookup(data.masterList), [data.masterList]);

    useEffect(() => {
        setSelectedItemIds((current) => {
            if (current.length === 0) {
                return current;
            }
            const filtered = current.filter((id) => itemLookup.has(id));
            return filtered.length === current.length ? current : filtered;
        });
    }, [itemLookup]);

    const selectedItems = useMemo(
        () => selectedItemIds.map((id) => itemLookup.get(id)).filter((item) => Boolean(item)),
        [itemLookup, selectedItemIds]
    );

    useEffect(() => {
        if (selectedItems.length > 0) {
            setMoveError(null);
        }
    }, [selectedItems]);

    const categoryOptions = useMemo(() => {
        if (!data.masterList || selectedItems.length === 0) {
            return [];
        }
        const sections = Array.isArray(data.masterList.sections) ? data.masterList.sections : [];
        const normalizedCurrentIds = new Set(
            selectedItems.map((item) => (item && item.categoryId ? item.categoryId : ''))
        );

        const uniqueOptions = [];
        const seen = new Set();

        sections.forEach((section) => {
            const id = section.id === 'uncategorized' ? '' : section.id;
            const name = section.name || 'Uncategorized';
            if (!seen.has(id)) {
                seen.add(id);
                uniqueOptions.push({ id, name });
            }
        });

        let filteredOptions = uniqueOptions;

        if (normalizedCurrentIds.size === 1) {
            const [onlyId] = Array.from(normalizedCurrentIds);
            filteredOptions = uniqueOptions.filter((option) => option.id !== onlyId);
        }

        if (
            !filteredOptions.some((option) => option.id === '') &&
            !(normalizedCurrentIds.size === 1 && normalizedCurrentIds.has(''))
        ) {
            filteredOptions = [...filteredOptions, { id: '', name: 'Uncategorized' }];
        }

        return filteredOptions;
    }, [data.masterList, selectedItems]);

    useEffect(() => {
        if (!hasLoadedStoredTarget) {
            return;
        }
        if (selectedItems.length === 0 || categoryOptions.length === 0) {
            return;
        }
        if (!categoryOptions.some((option) => option.id === moveTarget)) {
            const fallback = categoryOptions[0].id;
            setMoveTarget(fallback);
            window.localStorage.setItem(MOVE_TARGET_STORAGE_KEY, fallback);
        }
    }, [selectedItems, categoryOptions, moveTarget, hasLoadedStoredTarget]);

    const hasMoveOptions = categoryOptions.length > 0;

    const handleSelectItem = (itemId) => {
        setMoveError(null);
        setSelectedItemIds((current) => {
            if (current.includes(itemId)) {
                return current.filter((id) => id !== itemId);
            }
            return [...current, itemId];
        });
    };

    const handleMoveSubmit = async (event) => {
        event.preventDefault();
        if (isBusy || !data.masterList || selectedItems.length === 0 || !hasMoveOptions) {
            return;
        }

        const listId = data.masterList.id;
        const targetCategoryId = moveTarget === '' ? null : moveTarget;
        const itemsToMove = selectedItems.filter((item) => item && item.id && item.name);

        if (itemsToMove.length === 0) {
            return;
        }

        const targetCategoryName =
            moveTarget === ''
                ? 'Uncategorized'
                : categoryOptions.find((option) => option.id === moveTarget)?.name || 'chosen category';

        const previousMasterList = cloneMasterList(data.masterList);
        const optimisticMasterList = buildOptimisticMasterList(
            data.masterList,
            itemsToMove,
            targetCategoryId,
            targetCategoryName
        );

        setMoving(true);
        setMoveError(null);

        if (optimisticMasterList) {
            setData((prev) => ({ ...prev, masterList: optimisticMasterList }));
        }
        setSelectedItemIds([]);

        itemsToMove.forEach((item) => {
            addToast(`${item.name} moved to ${targetCategoryName}`);
        });

        try {
            let latestMasterList = null;

            for (const item of itemsToMove) {
                const response = await fetch('/api/master/move', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        list_id: listId,
                        items: [{ item_id: item.id, item_name: item.name }],
                        target_category_id: targetCategoryId,
                    }),
                });

                if (!response.ok) {
                    const message = await response.text();
                    throw new Error(message || 'Request failed');
                }

                const payload = await response.json();
                latestMasterList = payload.masterList || latestMasterList;
            }

            if (latestMasterList) {
                setData((prev) => ({ ...prev, masterList: latestMasterList }));
            }
        } catch (error) {
            console.error(error);
            if (previousMasterList) {
                setData((prev) => ({ ...prev, masterList: previousMasterList }));
            }
            setSelectedItemIds(itemsToMove.map((item) => item.id));
            setMoveError('Unable to move items. Changes reverted.');
            addToast('Move failed. Changes reverted.');
        } finally {
            setMoving(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (isBusy || !data.masterList || selectedItems.length === 0) {
            return;
        }

        const listId = data.masterList.id;
        const itemsToDelete = selectedItems.filter((item) => item && item.id);
        if (itemsToDelete.length === 0) {
            return;
        }

        const confirmation =
            itemsToDelete.length === 1
                ? `Delete "${itemsToDelete[0].name}" from the master list?`
                : `Delete ${itemsToDelete.length} items from the master list?`;

        if (!window.confirm(confirmation)) {
            return;
        }

        setDeleting(true);
        setMoveError(null);

        try {
            const response = await fetch('/api/master/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    list_id: listId,
                    item_ids: itemsToDelete.map((item) => item.id),
                }),
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || 'Request failed');
            }

            const payload = await response.json();
            const masterList = payload.masterList || null;
            setData((prev) => ({ ...prev, masterList }));

            if (!masterList) {
                setSelectedItemIds([]);
            } else {
                const refreshedLookup = buildItemLookup(masterList);
                setSelectedItemIds((current) => current.filter((id) => refreshedLookup.has(id)));
            }

            itemsToDelete.forEach((item) => {
                if (item && item.name) {
                    addToast(`${item.name} deleted`);
                }
            });
        } catch (error) {
            console.error(error);
            setMoveError('Unable to delete items. Try again.');
        } finally {
            setDeleting(false);
        }
    };

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

    const masterSections = data.masterList?.sections || [];
    const masterUnavailable = !loading && !data.masterList;

    let masterContent;
    if (loading) {
        masterContent = React.createElement('p', { className: 'status' }, 'Loading master list…');
    } else if (masterUnavailable) {
        masterContent = React.createElement('p', { className: 'status' }, status || 'Master list unavailable.');
    } else if (masterSections.length === 0) {
        masterContent = React.createElement('p', { className: 'status' }, 'No items in master list.');
    } else {
        masterContent = masterSections.map((section) =>
            React.createElement(
                'div',
                {
                    className: 'category-block',
                    key: section.id || section.name,
                },
                React.createElement('h2', null, section.name),
                React.createElement(
                    'ul',
                    { className: 'category-items' },
                    section.items.map((item) =>
                        React.createElement(
                            'li',
                            {
                                key: item.id || item.name,
                                className: `selectable${selectedItemIds.includes(item.id) ? ' selected' : ''}`,
                                onClick: () => handleSelectItem(item.id),
                                onKeyDown: (event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        handleSelectItem(item.id);
                                    }
                                },
                                tabIndex: 0,
                                role: 'button',
                            },
                            item.name
                        )
                    )
                )
            )
        );
    }

    const hasMovePanel = Boolean(!loading && !masterUnavailable && selectedItems.length > 0);

    const totalSelected = selectedItems.length;
    const selectionLabel = totalSelected === 1 ? 'Selected item' : 'Selected items';
    const selectionTitle =
        totalSelected === 1 ? selectedItems[0].name : `${totalSelected} items selected`;
    const moveButtonLabel = totalSelected > 1 ? `Move ${totalSelected} items` : 'Move item';

    const movePanel = hasMovePanel
        ? React.createElement(
            'form',
            { className: 'move-panel', onSubmit: handleMoveSubmit },
            React.createElement(
                'header',
                null,
                React.createElement('p', { className: 'move-label' }, selectionLabel),
                React.createElement('h2', { className: 'move-title' }, selectionTitle)
            ),
            totalSelected > 1 &&
            React.createElement(
                'ul',
                { className: 'move-selected-list' },
                selectedItems.map((item) =>
                    React.createElement(
                        'li',
                        { key: item.id || item.name },
                        item.name
                    )
                )
            ),
            React.createElement(
                'label',
                { className: 'move-field' },
                'Move to category',
                hasMoveOptions
                    ? React.createElement(
                        'select',
                        {
                            value: moveTarget,
                            onChange: (event) => {
                                const value = event.target.value;
                                setMoveTarget(value);
                                window.localStorage.setItem(MOVE_TARGET_STORAGE_KEY, value);
                            },
                            disabled: isBusy,
                        },
                        categoryOptions.map((option) =>
                            React.createElement(
                                'option',
                                { key: option.id || 'uncategorized', value: option.id },
                                option.name
                            )
                        )
                    )
                    : React.createElement(
                        'p',
                        { className: 'move-empty' },
                        'No other categories available'
                    )
            ),
            moveError && React.createElement('p', { className: 'status error' }, moveError),
            React.createElement(
                'div',
                { className: 'move-actions' },
                React.createElement(
                    'button',
                    {
                        className: 'primary-btn',
                        type: 'submit',
                        disabled: isBusy || !hasMoveOptions,
                    },
                    moving ? 'Moving…' : moveButtonLabel
                ),
                React.createElement(
                    'button',
                    {
                        className: 'danger-btn',
                        type: 'button',
                        onClick: handleDeleteSelected,
                        disabled: isBusy,
                    },
                    deleting
                        ? 'Deleting…'
                        : totalSelected > 1
                            ? `Delete ${totalSelected} items`
                            : 'Delete item'
                ),
                React.createElement(
                    'button',
                    {
                        className: 'secondary-btn',
                        type: 'button',
                        onClick: () => setSelectedItemIds([]),
                        disabled: isBusy,
                    },
                    'Clear selection'
                )
            )
        )
        : null;

    const masterBody = React.createElement(
        'div',
        { className: movePanel ? 'master-body has-panel' : 'master-body' },
        React.createElement('div', { className: 'master-content' }, masterContent),
        movePanel
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
                    'h1',
                    null,
                    loading
                        ? (data.masterList?.name || 'Master List')
                        : `${data.masterList?.name || 'Master List'} (${data.masterList?.itemCount || 0} items)`
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

    return React.createElement(
        React.Fragment,
        null,
        toastElements,
        React.createElement(
            'main',
            { className: 'container' },
            view === 'master' ? masterView : listsView
        )
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
