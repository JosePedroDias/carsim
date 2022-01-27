const _getGamepads = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : navigator.webkitGetGamepads.bind(navigator);

// assuming single controller for simplicity
window.controller = {};

/*const statusEl = document.createElement('div');
statusEl.appendChild(document.createTextNode('asd'));
document.body.appendChild(statusEl);
let lastText;
function log(text) {
    if (text !== lastText) {
        statusEl.innerHTML = text;
        console.log(text);
        lastText = text;
    }
}*/

window.addEventListener('gamepadconnected', () => requestAnimationFrame(updateStatus));

const getValue = (b) => typeof b === 'object' ? b.value : b;

function updateStatus() {
    requestAnimationFrame(updateStatus);
    const gamepads = _getGamepads();
    let j = -1;
    for (let ct of gamepads) {
        ++j;
        if (!ct) continue;
        const axes = ct.axes;
        const buttons = ct.buttons;
        const b1 = getValue(buttons[0]);
        const b2 = getValue(buttons[1]);
        //log(`#${j}: x:${axes[0].toFixed(2)}, y:${axes[1].toFixed(2)}, b1:${b1.toFixed(1)}, b2:${b2.toFixed(1)}`);
        window.controller = { active:true, x:axes[0], y:axes[1], b1, b2 };
    }
}