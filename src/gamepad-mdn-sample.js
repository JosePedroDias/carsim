const haveEvents = 'ongamepadconnected' in window;
const controllers = {};

function addGamepad(gamepad) {
    controllers[gamepad.index] = gamepad;

    const d = document.createElement('div');
    d.setAttribute('id', 'controller' + gamepad.index);

    const t = document.createElement('h1');
    t.appendChild(document.createTextNode('gamepad: ' + gamepad.id));
    d.appendChild(t);

    const b = document.createElement('div');
    b.className = 'buttons';
    for (let i = 0; i < gamepad.buttons.length; i++) {
        const e = document.createElement('span');
        e.style.padding = '2px 4px';
        e.className = 'button';
        //e.id = 'b' + i;
        e.innerHTML = i;
        b.appendChild(e);
    }

    d.appendChild(b);

    const a = document.createElement('div');
    a.className = 'axes';

    for (let i = 0; i < gamepad.axes.length; i++) {
        const p = document.createElement('progress');
        p.className = 'axis';
        //p.id = 'a' + i;
        p.setAttribute('max', '2');
        p.setAttribute('value', '1');
        p.innerHTML = i;
        a.appendChild(p);
    }

    d.appendChild(a);

    // See https://github.com/luser/gamepadtest/blob/master/index.html
    const start = document.getElementById('start');
    if (start) {
        start.style.display = 'none';
    }

    document.body.appendChild(d);
    requestAnimationFrame(updateStatus);
}

function removeGamepad(gamepad) {
    const d = document.getElementById('controller' + gamepad.index);
    document.body.removeChild(d);
    delete controllers[gamepad.index];
}

function updateStatus() {
    if (!haveEvents) {
        scanGamepads();
    }

    for (let j in controllers) {
        const controller = controllers[j];
        const d = document.getElementById('controller' + j);
        const buttons = d.getElementsByClassName('button');

        for (let i = 0; i < controller.buttons.length; i++) {
            const b = buttons[i];
            let val = controller.buttons[i];
            let pressed = val == 1.0;
            if (typeof (val) == 'object') {
                pressed = val.pressed;
                val = val.value;
            }

            const pct = Math.round(val * 100) + '%';
            b.style.backgroundSize = pct + ' ' + pct;

            b.style.background = pressed ? 'red' : '';

            /* if (pressed) {
                b.className = 'button pressed';
            } else {
                b.className = 'button';
            } */
        }

        const axes = d.getElementsByClassName('axis');
        for (let i = 0; i < controller.axes.length; i++) {
            const a = axes[i];
            a.innerHTML = i + ': ' + controller.axes[i].toFixed(4);
            a.setAttribute('value', controller.axes[i] + 1);
        }
    }

    requestAnimationFrame(updateStatus);
}

window.addEventListener('gamepadconnected', (ev) => addGamepad(ev.gamepad));
window.addEventListener('gamepaddisconnected', (ev) => removeGamepad(ev.gamepad));

function scanGamepads() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            //console.warn(i, gamepads[i]);
            if (gamepads[i].index in controllers) {
                controllers[gamepads[i].index] = gamepads[i];
            } else {
                addGamepad(gamepads[i]);
            }
        }
    }
}

if (!haveEvents) {
    setInterval(scanGamepads, 500);
}
