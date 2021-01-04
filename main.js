const EventEmitter = require('events'), request = require('request');

let LogikEngine = require('./automation');

module.exports = class AutomationSystem extends EventEmitter
{
	constructor(logger, storagePath, dataManager)
	{
		super();

		super.setMaxListeners(256);

		this.LogikEngine = new LogikEngine(logger, storagePath, dataManager);
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