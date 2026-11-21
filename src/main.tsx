import { render } from 'preact';
import { App } from './ui/App';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/800.css';
import '@fontsource-variable/inter';
import './ui/style.css';
import { initNative } from './native';

initNative();

render(<App />, document.getElementById('app')!);
