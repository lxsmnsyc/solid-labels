import { render } from '@solidjs/web';
import { Repl } from '../repl/Repl';

// The server renders the starting code into this node. The REPL replaces it.
const root = document.getElementById('repl-root');
if (root !== null) {
  root.textContent = '';
  render(() => <Repl />, root);
}
