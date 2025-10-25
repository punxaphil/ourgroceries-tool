const { useEffect, useState } = React;
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
                { className: 'category-block', key: section.id || section.name },
                React.createElement('h2', null, section.name),
                React.createElement(
                    'ul',
                    null,
                    section.items.map((item) =>
                        React.createElement('li', { key: item.id || item.name }, item.name)
                    )
                )
            )
        );
    }

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
            masterContent
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
