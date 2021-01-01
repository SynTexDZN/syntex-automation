const EventEmitter = require('events');

class MyEmitter extends EventEmitter {}

const emitter = new MyEmitter();

emitter.setMaxListeners(64);

module.exports = emitter;