// @ts-check
const ACCEPT_MOUSE = false; // (good for debugging this in a desktop browser)

function virtualGamepad(padConfigs, mouseSupport) {
    const XMLNS = 'http://www.w3.org/2000/svg';
    const RAD2DEG = 180 / Math.PI;
    const PAD_FACTOR_FROM_MIN_DIM = 0.14;

    function _createPad({ color, label }) {
        let svg, dim, c, C, pad;

        function create() {
            const firstCall = !c;

            if (svg) document.body.removeChild(svg);

            svg = document.createElementNS(XMLNS, 'svg');
            svg.setAttribute('width', dim + pad * 2);
            svg.setAttribute('height', dim + pad * 2);
            document.body.appendChild(svg);

            const cx = pad + dim / 2;

            C = document.createElementNS(XMLNS, 'circle');
            C.setAttribute('cx', cx);
            C.setAttribute('cy', cx);
            C.setAttribute('r', dim / 2);
            C.setAttribute('fill', color);
            C.setAttribute('opacity', 0.4);
            svg.appendChild(C);

            const r = dim * 0.3;
            c = document.createElementNS(XMLNS, 'circle');
            c.setAttribute('cx', cx);
            c.setAttribute('cy', cx);
            c.setAttribute('r', r);
            c.setAttribute('fill', color);
            c.setAttribute('opacity', 0.4);
            svg.appendChild(c);

            const t = document.createElementNS(XMLNS, 'text');
            t.setAttribute('x', cx);
            t.setAttribute('y', cx);
            t.setAttribute('text-anchor', 'middle');       // X
            t.setAttribute('dominant-baseline', 'middle'); // Y
            t.setAttribute('font-size', r);
            t.setAttribute('fill', 'white');
            t.appendChild(document.createTextNode(label));
            svg.appendChild(t);

            firstCall && moveBig([-1000, -1000]);
        }

        function updateDim(dim_) {
            pad = dim_ / 2;
            dim = dim_;
            create();
        }

        function moveBig([x, y]) {
            svg.style.left = `${x - dim / 2 - pad}px`;
            svg.style.top = `${y - dim / 2 - pad}px`;
        }

        function moveSmall([x, y]) {
            c.setAttribute('cx', x + pad + dim / 2);
            c.setAttribute('cy', y + pad + dim / 2);
        }

        function setOpacity(v) {
            C.setAttribute('opacity', 0.4 * v);
            c.setAttribute('opacity', 0.4 * v);
        }

        return { updateDim, moveBig, moveSmall, setOpacity }
    }

    function createPad({ color, area, deadZone, fixes, label }) {
        let w, h, radiusBig;
        let downAt, lastAt, lastDist = 0, lastDelta = [0, 0];

        let g = _createPad({ color, label });

        area.x[2] = 0.5 * (area.x[0] + area.x[1]);
        area.y[2] = 0.5 * (area.y[0] + area.y[1]);

        function updateDims([w_, h_]) {
            w = w_;
            h = h_;
            const minDim = Math.min(w, h);
            radiusBig = minDim * PAD_FACTOR_FROM_MIN_DIM;
            g.updateDim(radiusBig*2);
        }

        function updateEvent([x, y], isDown, isUp) {
            const xr = x / w;
            const yr = y / h;

            if (xr < area.x[0] || xr > area.x[1] || yr < area.y[0] || yr > area.y[1]) return;

            if (isDown) {
                const tmp = fixes.start ? [area.x[2] * w, area.y[2] * h] : [x, y];
                downAt = tmp;
                lastAt = tmp;
                // @ts-ignore
                g.moveBig(tmp);
                g.moveSmall([0, 0]);
                g.setOpacity(1);
            } else if (isUp) {
                downAt = undefined;
                lastAt = undefined;
                lastDist = 0;
                lastDelta = [0, 0];
                g.setOpacity(0.5);
                g.moveSmall([0, 0]);
            } else if (downAt) { // move while down
                const R = radiusBig;
                lastAt = [
                    fixes.x ? downAt[0] : x,
                    fixes.y ? downAt[1] : y
                ];
                {
                    let dx = lastAt[0] - downAt[0];
                    let dy = lastAt[1] - downAt[1];
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > R) {
                        const factor = R / dist;
                        dx *= factor;
                        dy *= factor;
                        lastAt = [
                            downAt[0] + dx,
                            downAt[1] + dy,
                        ];
                        lastDist = R;
                    } else {
                        lastDist = dist;
                    }
                    lastDelta = [dx, dy];
                }
                // @ts-ignore
                g.moveSmall(lastDelta);
            }
        }

        function getData() {
            const R = radiusBig;
            const distRatio = lastDist / R;
            const angleRads = Math.atan2(lastDelta[1], lastDelta[0]);
            const angleDegs = angleRads * RAD2DEG;
            let dir;
            if (distRatio <= deadZone) dir = 'center';
            else if (angleDegs > -157.5 && angleDegs <= -112.5) dir = 'top-left';
            else if (angleDegs > -112.5 && angleDegs <=  -67.5) dir = 'top';
            else if (angleDegs >  -67.5 && angleDegs <=  -22.5) dir = 'top-right';
            else if (angleDegs >  -22.5 && angleDegs <=   22.5) dir = 'right';
            else if (angleDegs >   22.5 && angleDegs <=   67.5) dir = 'bottom-right';
            else if (angleDegs >   67.5 && angleDegs <=  112.5) dir = 'bottom';
            else if (angleDegs >  112.5 && angleDegs <=  157.5) dir = 'bottom-left';
            else dir = 'left';
            return {
                label,
                isDown: !!downAt,
                center: downAt ? downAt : [area.x[2] * w, area.y[2] * h],
                delta: lastDelta,
                delta1: [lastDelta[0]/R, lastDelta[1]/R],
                dist: lastDist,
                distRatio,
                angleRads,
                angleDegs,
                dir
            };
        }

        return { updateDims, updateEvent, getData }
    }

    const pads = padConfigs.map(c => {
        return createPad({ color: c.color, area: c.area, label: c.label, deadZone: c.deadZone, fixes: c.fixes });
    });

    function updatePadsDims(dims) {
        pads.forEach(p => p.updateDims(dims));
    }

    function updatePadsEvent(pos, isDown, isUp) {
        pads.forEach(p => p.updateEvent(pos, isDown, isUp));
    }

    function handleEvent(ev) {
        ev.preventDefault();
        ev.stopPropagation();

        const isDown = ev.type === 'touchstart' || ev.type === 'mousedown';
        const isUp = ev.type === 'touchend' || ev.type === 'mouseup';

        if (ev.touches) {
            for (const ev2 of ev.changedTouches) {
                updatePadsEvent([ev2.clientX, ev2.clientY], isDown, isUp);
            }
        } else {
            updatePadsEvent([ev.clientX, ev.clientY], isDown, isUp);
        }
    }

    updatePadsDims([window.innerWidth, window.innerHeight]);
    window.addEventListener('resize', () => {
        updatePadsDims([window.innerWidth, window.innerHeight]);
    });

    let eventNames = ['touchstart', 'touchmove', 'touchend'];
    if (mouseSupport) {
        eventNames = eventNames.concat(['mousedown', 'mousemove', 'mouseup']);
    }
    for (let evName of eventNames) {
        window.addEventListener(evName, handleEvent);
    }

    return pads;
}

{
    if ('ontouchstart' in window || ACCEPT_MOUSE) {
        const [pSteer, pAccelBrake, pRecover, pCamera] = virtualGamepad([
            {
                label: 'steer',
                color: 'cyan',
                area: { x: [0, 0.5], y: [0.5, 1] },
                deadZone: 0,
                fixes: { y: true }
            },
            {
                label: 'accel/brake',
                color: 'yellow',
                area: { x: [0.5, 1], y: [0.5, 1] },
                deadZone: 0,
                fixes: { x: true }
            },
            {
                label: 'recover',
                color: 'magenta',
                area: { x: [0, 0.5], y: [0, 0.5] },
                deadZone: 0,
                fixes: { x: true, y: true }
            },
            {
                label: 'camera',
                color: 'blue',
                area: { x: [0.5, 1], y: [0, 0.5] },
                deadZone: 0,
                fixes: { x: true, y: true }
            }
        ], ACCEPT_MOUSE);

        // const clamp = (v, m, M) => v < m ? m : v > M ? M : v;

        let started = false;
        setInterval(() => {
            const dS = pSteer.getData();
            const dAB = pAccelBrake.getData();
            const dR = pRecover.getData();
            const dC = pCamera.getData();

            if (!started) {
                if (dS.isDown || dAB.isDown || dR.isDown) started = true;
                else return;
            }

            const steer = dS.delta1[0];
            //console.warn(`steer ${steer.toFixed(3)}`);
            window.controller.x = steer;
            
            const accBr = dAB.delta1[1];
            //console.warn(`accBr ${accBr.toFixed(3)}`);
            window.controller.y = accBr; // clamp(accBr, -1, 1);

            window.controller.b1 = dR.isDown;
            window.controller.b2 = dC.isDown;
        }, 1000 /20);
    }
}
