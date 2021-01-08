let LogikEngine = require('./automation');

const EventEmitter = require('events'), request = require('request');

module.exports = class AutomationSystem extends EventEmitter
{
	constructor(logger, storagePath, dataManager, isServer)
	{
		super();

		super.setMaxListeners(256);

		this.logger = logger;

		this.LogikEngine = new LogikEngine(logger, storagePath, dataManager, isServer, this);
	}

	setInputStream(stream, callback)
	{
		super.on(stream, (reciever, values) => {

			this.logger.debug('<<< ' + stream + ' ' + JSON.stringify(reciever) + ' ' + JSON.stringify(values));
			
			callback(reciever, values)
		});
	}

	setOutputStream(stream, reciever, values)
	{
		super.emit(stream, reciever, values);

		this.logger.debug('>>> ' + stream + ' ' + JSON.stringify(reciever) + ' ' + JSON.stringify(values));
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