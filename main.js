const EventEmitter = require('events');

class AutomationSystem extends EventEmitter
{
	constructor()
	{
		super();
	}

	setInputStream(stream, callback)
	{
		super.on(stream, (reciever, values) => callback(reciever, values));
	}

	setOutputStream(stream, reciever, values)
	{
		super.emit(stream, reciever, values);
	}
}

const automation = new AutomationSystem();

automation.setMaxListeners(256);

module.exports = automation;