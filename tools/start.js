// Lance Electron proprement : certains environnements (VS Code, terminaux intégrés) définissent
// ELECTRON_RUN_AS_NODE, ce qui ferait démarrer Electron comme un simple Node.
const { spawn } = require('child_process');
const electron = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, ['.', ...process.argv.slice(2)], { stdio: 'inherit', env, cwd: require('path').join(__dirname, '..') });
child.on('close', code => process.exit(code));
