const EventEmitter = require('events'), request = require('request');

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
		if(!super.emit(stream, reciever, values))
		{
			
		}

		sendToAutomationServer(values);
	}

	sendToAutomationServer(values)
	{
		var url = 'http://localhost:1777/update-automation', first = true;

		for(const value in Object.keys(values))
		{
			url += (first ? '?' : '&') + value + '=' + values[value];
		}

		var theRequest = {
			method : 'GET',
			url : url,
			timeout : 10000
		};
	
		request(theRequest, () => {});
	}
}

const automation = new AutomationSystem();

automation.setMaxListeners(256);

module.exports = automation;