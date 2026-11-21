import { render } from 'preact';
import { App } from './ui/App';
import './ui/style.css';
import { initNative } from './native';

initNative();

render(<App />, document.getElementById('app')!);
