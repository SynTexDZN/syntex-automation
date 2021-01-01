const emitter = require('./emitter');

class AutomationSystem
{
	constructor()
	{
		
	}

	addInputStream(key)
	{
		emitter.on(key, (values) => {

			console.log('Emitter Received', values);
		});
	}

	addOutputStream(key, values)
	{
		emitter.emit(key, values);
	}
}

module.exports = new AutomationSystem();