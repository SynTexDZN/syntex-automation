const Emitter = require('./emitter');

module.exports = class AutomationSystem
{
	constructor()
	{
		this.emitter = new Emitter();

		console.log('STARTED');

		this.addInputStream('DemoEvent');

		setTimeout(() => this.addOutputStream('DemoEvent', { hallo : true, welt : 'Hey' }), 10000);
	}

	addInputStream(key)
	{
		this.emitter.on(key, (values) => {

			console.log('Emitter Received', values);
		});
	}

	addOutputStream(key, values)
	{
		emitter.emit(key, values);
	}
}