const emitter = require('./emitter');

class AutomationSystem
{
	constructor()
	{
		
	}

	setInputStream(stream, callback)
	{
		emitter.on(stream, (reciever, values) => {

			console.log('Emitter Received', values);

			callback(reciever, values);
		});
	}

	setOutputStream(stream, reciever, values)
	{
		emitter.emit(stream, reciever, values);
	}
}

module.exports = new AutomationSystem();