const { useEffect, useState } = React;

function App() {
    const [lists, setLists] = useState([]);
    const [status, setStatus] = useState('Loading lists…');

    useEffect(() => {
        fetch('/api/lists')
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Request failed with ${response.status}`);
                }
                return response.json();
            })
            .then((payload) => {
                setLists(payload.lists || []);
                if (!payload.lists || payload.lists.length === 0) {
                    setStatus('No lists found.');
                } else {
                    setStatus(null);
                }
            })
            .catch((error) => {
                console.error(error);
                setStatus('Unable to load lists. Check credentials and try again.');
            });
    }, []);

    return React.createElement(
        'main',
        { className: 'container' },
        React.createElement('h1', null, 'OurGroceries Lists'),
        status && React.createElement('p', { className: 'status' }, status),
        React.createElement(
            'ul',
            { className: 'lists' },
            lists.map((name) =>
                React.createElement('li', { key: name }, name)
            )
        )
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
