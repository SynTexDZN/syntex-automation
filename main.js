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

		sendToAutomationServer(reciever.id, reciever.letters, values);
	}

	sendToAutomationServer(id, letters, values)
	{
		var url = 'http://localhost:1777/update-automation?id=' + id + '&letters=' + letters;

		for(const value of Object.keys(values))
		{
			url += '&' + value + '=' + values[value];
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