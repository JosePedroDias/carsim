
// https://developer.mozilla.org/en-US/docs/Web/SVG/Element
// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/Presentation
// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d#path_commands


function inputUi() {
    const xmlns = 'http://www.w3.org/2000/svg';

    const svg = document.createElementNS(xmlns, 'svg');
    svg.setAttribute('width',  400);
    svg.setAttribute('height', 400);
    document.body.appendChild(svg);

    const circle = document.createElementNS(xmlns, 'circle');
    circle.setAttribute('cx',  50);
    circle.setAttribute('cy',  50);
    circle.setAttribute('r',  100);
    circle.setAttribute('stroke',  'blue');
    svg.appendChild(circle);

    const rect = document.createElementNS(xmlns, 'rect');
    rect.setAttribute('x',  150);
    rect.setAttribute('y',  100);
    rect.setAttribute('width',  100);
    rect.setAttribute('height',  100);
    rect.setAttribute('stroke',  'red');
    svg.appendChild(rect);

    const path = document.createElementNS(xmlns, 'path');
    path.setAttribute('d', 'M230,30 l20,20 l-20,20 l-20,-20 Z');
    path.setAttribute('stroke', 'yellow');
    path.setAttribute('stroke-width', 3);
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-dasharray', '12 6');
    path.setAttribute('opacity', 0.75);
    path.setAttribute('fill',  'none');
    svg.appendChild(path);

    const text = document.createElementNS(xmlns, 'text');
    text.setAttribute('x',  50);
    text.setAttribute('y',  200);
    text.setAttribute('fill',  'white');
    text.appendChild(document.createTextNode('HELLO!'));
    svg.appendChild(text);
}

inputUi();
