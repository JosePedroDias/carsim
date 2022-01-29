// @ts-check

function setupCarHud() {
    const XMLNS = 'http://www.w3.org/2000/svg';
    const DEG2RAD = Math.PI / 180;

    const W = 140;
    const H = 140;

    const R = 66;

    const MAX_VEL = 170;

    const ANGLE_0 = -90 * 1.5;
    const ANGLE_SCALE = 270 / MAX_VEL;

    let velocity = 0;

    const velocityToAngle = (v) => ANGLE_0 + ANGLE_SCALE * v;

    const svg = document.createElementNS(XMLNS, 'svg');
    svg.setAttribute('id', 'car-hud');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `${-W/2} ${-H/2} ${W} ${H}`);

    const circle = document.createElementNS(XMLNS, 'circle');
    circle.setAttribute('cx', 0);
    circle.setAttribute('cy', 0);
    circle.setAttribute('r',  R);
    circle.setAttribute('fill', 'black');
    circle.setAttribute('fill-opacity', 0.33);
    svg.appendChild(circle);

    // add ticks and numbers
    const g = document.createElementNS(XMLNS, 'g');
    for (let n = 0; n <= MAX_VEL; n += 10) {
        const angleDegs = velocityToAngle(n);
        const every2 = n % 20;

        const whitePath = document.createElementNS(XMLNS, 'path');
        whitePath.setAttribute('d', `M0,-${R*0.6} l0,-${R*(every2 ? 0.12 : 0.08)}`);
        whitePath.setAttribute('stroke', 'white');
        whitePath.setAttribute('stroke-width', 2);
        whitePath.setAttribute('fill', 'none');
        whitePath.setAttribute('transform', `rotate(${angleDegs})`);
        g.appendChild(whitePath);

        if (every2) {
            const r = R * 0.85;
            const x = r*Math.sin(angleDegs * DEG2RAD);
            const y = -r*Math.cos(angleDegs * DEG2RAD);
            const text = document.createElementNS(XMLNS, 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', y);
            text.setAttribute('text-anchor', 'middle');        // X
            text.setAttribute('alignment-baseline', 'middle'); // Y
            text.setAttribute('font-size', 9);
            text.setAttribute('fill', 'white');
            text.appendChild(document.createTextNode(`${n}`));
            svg.appendChild(text);
        }
    }
    svg.appendChild(g);

    {
        const text = document.createElementNS(XMLNS, 'text');
        text.setAttribute('y', R*0.4);
        text.setAttribute('text-anchor', 'middle');        // X
        text.setAttribute('alignment-baseline', 'middle'); // Y
        text.setAttribute('font-size', 12);
        text.setAttribute('fill', 'white');
        text.appendChild(document.createTextNode(`km/h`));
        svg.appendChild(text);
    }

    const redPath = document.createElementNS(XMLNS, 'path');
    redPath.setAttribute('d', `M0,0 l0,-${R*0.8}`);
    redPath.setAttribute('stroke', 'red');
    redPath.setAttribute('stroke-width', 2);
    redPath.setAttribute('fill', 'none');
    redPath.setAttribute('transform', `rotate(${velocityToAngle(velocity)})`);
    svg.appendChild(redPath);


    document.body.appendChild(svg);

    function changeSpeed(vel) {
        vel = Math.abs(vel);
        velocity = vel < 0 ? 0 : vel > MAX_VEL ? MAX_VEL : vel;
        redPath.setAttribute('transform', `rotate(${velocityToAngle(velocity)})`);
    }

    return { changeSpeed };
}

window.carHud = setupCarHud();
