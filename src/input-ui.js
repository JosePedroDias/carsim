
// https://developer.mozilla.org/en-US/docs/Web/SVG/Element
// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/Presentation
// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d#path_commands


(function() {
    const xmlns = 'http://www.w3.org/2000/svg';

    function createControllerUI(width, height, id) {
        const svg = document.createElementNS(xmlns, 'svg');
        svg.setAttribute('id', id);
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        document.body.appendChild(svg);

        function createHorizontalAxis([x, y], minV_, color) {
            const maxW = 100;
            const maxH = 10;
            const minV = minV_ !== undefined ? minV_ : 0;
            const maxV = 1;

            const strokedRect = document.createElementNS(xmlns, 'rect');
            strokedRect.setAttribute('x', x);
            strokedRect.setAttribute('y', y);
            strokedRect.setAttribute('width', maxW);
            strokedRect.setAttribute('height', maxH);
            strokedRect.setAttribute('stroke', color);
            strokedRect.setAttribute('fill', 'none');
            svg.appendChild(strokedRect);

            const filledRect = document.createElementNS(xmlns, 'rect');
            filledRect.setAttribute('x', x);
            filledRect.setAttribute('y', y);
            filledRect.setAttribute('width', 0);
            filledRect.setAttribute('height', maxH);
            filledRect.setAttribute('stroke', 'none');
            filledRect.setAttribute('fill',  color);
            svg.appendChild(filledRect);

            return function update(v) {
                filledRect.setAttribute('width', maxW * (v - minV)/(maxV - minV));
            }
        }

        function createVerticalAxis([x, y], minV_, inverted, color) {
            const maxW = 10;
            const maxH = 100;
            const minV = minV_ !== undefined ? minV_ : 0;
            const maxV = 1;

            const strokedRect = document.createElementNS(xmlns, 'rect');
            strokedRect.setAttribute('x', x);
            strokedRect.setAttribute('y', y);
            strokedRect.setAttribute('width', maxW);
            strokedRect.setAttribute('height', maxH);
            strokedRect.setAttribute('stroke', color);
            strokedRect.setAttribute('fill', 'none');
            svg.appendChild(strokedRect);

            const filledRect = document.createElementNS(xmlns, 'rect');
            filledRect.setAttribute('x', x);
            filledRect.setAttribute('y', inverted ? y + maxH : y);
            filledRect.setAttribute('width', maxW);
            filledRect.setAttribute('height', 0);
            filledRect.setAttribute('stroke', 'none');
            filledRect.setAttribute('fill',  color);
            svg.appendChild(filledRect);

            return function update(v) {
                const h = maxH * (v - minV)/(maxV - minV);
                filledRect.setAttribute('height', h);
                if (inverted) {
                    filledRect.setAttribute('y', y + (maxH - h));
                }
            }
        }

        function createButton([x, y], color) {
            const maxR = 10;
            const maxV = 1;

            const strokedCircle = document.createElementNS(xmlns, 'circle');
            strokedCircle.setAttribute('cx', x);
            strokedCircle.setAttribute('cy', y);
            strokedCircle.setAttribute('r', maxR);
            strokedCircle.setAttribute('stroke', color);
            strokedCircle.setAttribute('fill', 'none');
            svg.appendChild(strokedCircle);

            const filledCircle = document.createElementNS(xmlns, 'circle');
            filledCircle.setAttribute('cx', x);
            filledCircle.setAttribute('cy', y);
            filledCircle.setAttribute('r', 0);
            filledCircle.setAttribute('stroke', 'none');
            filledCircle.setAttribute('fill', color);
            svg.appendChild(filledCircle);

            return function update(v) {
                // todo grow with area instead or radius
                filledCircle.setAttribute('r', maxR * v/maxV);
            }
        }

        return { createHorizontalAxis, createVerticalAxis, createButton };
    }

    if (false) {
        const cuG = createControllerUI(120, 140, 'cu-gamepad');
        const axisX = cuG.createHorizontalAxis([10, 10], -1, 'cyan');
        const axisY =   cuG.createVerticalAxis([10, 30], -1, false, 'magenta');
        //const accel =   cuG.createVerticalAxis([30, 30],  0, 'green');
        const b1    =         cuG.createButton([60, 40],     'yellow');

        function update() {
            requestAnimationFrame(update);
            const c = window.controller;
            axisX(c.x);
            axisY(c.y);
            b1(c.b1);
        }
        update();
    }
    
    if (true) {
        const cuC = createControllerUI(120, 140, 'cu-car');
        const steer = cuC.createHorizontalAxis([10, 10], -1, 'blue');
        const brake =   cuC.createVerticalAxis([10, 30],  0, true, 'red');
        const accel =   cuC.createVerticalAxis([30, 30], -1, true, 'green');
        const b1    =         cuC.createButton([60, 40],     'magenta');
        window.cuC = { cuC, steer, brake, accel, b1 }
    }
})();
