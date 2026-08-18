const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Smartphone } = require('lucide-react');

console.log(renderToStaticMarkup(createElement(Smartphone)));
