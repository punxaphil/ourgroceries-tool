import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './app.css';

function assertRootElement(): HTMLElement {
  const element = document.getElementById('root');
  if (!element) throw new Error('#root element not found');
  return element;
}

const root = ReactDOM.createRoot(assertRootElement());
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
