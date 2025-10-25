const { useEffect, useMemo, useState } = React;

const MAX_MASTER_ITEMS = 200;
const HASH_MASTER = '#/master';
const HASH_LISTS = '#/lists';

const resolveViewFromHash = (hash) => (hash === HASH_MASTER ? 'master' : 'lists');

function App() {
    const [data, setData] = useState({ lists: [], masterList: null });
    const [status, setStatus] = useState('Loading lists…');
    const [view, setView] = useState(resolveViewFromHash(window.location.hash));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!window.location.hash) {
            window.location.hash = HASH_LISTS;
        }
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
        if (view === 'master' && !data.masterList) {
            setStatus('Master list unavailable.');
        } else {
            setStatus((current) =>
                current === 'Master list unavailable.' ? null : current
            );
        }
    }, [view, data.masterList]);

    const masterPreview = useMemo(() => {
        if (!data.masterList) {
            return { items: [], note: null };
        }
        const items = Array.isArray(data.masterList.items)
            ? data.masterList.items.slice(0, MAX_MASTER_ITEMS)
            : [];
        let note = null;
        if (data.masterList.itemCount > MAX_MASTER_ITEMS) {
            note = `Showing first ${MAX_MASTER_ITEMS} of ${data.masterList.itemCount} items.`;
        }
        return { items, note };
    }, [data.masterList]);

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
            `View ${data.masterList.name || 'Master List'}`
        )
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
                    `${data.masterList?.name || 'Master List'} (${loading ? '…' : data.masterList?.itemCount || 0} items)`
                ),
                masterPreview.note &&
                React.createElement('p', { className: 'hint' }, masterPreview.note)
            ),
            React.createElement(
                'div',
                { className: 'master-items' },
                React.createElement(
                    'ul',
                    { className: 'master-list' },
                    loading
                        ? React.createElement('li', { className: 'loading-row' }, 'Loading items…')
                        : masterPreview.items.map((item) =>
                            React.createElement('li', { key: item.id || item.name }, item.name)
                        )
                )
            )
        )
    );

    return React.createElement(
        'main',
        { className: 'container' },
        view === 'master' ? masterView : listsView
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
