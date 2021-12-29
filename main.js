let LogikEngine = require('./automation'), RouteManager = require('./route-manager');

const EventEmitter = require('events');

module.exports = class AutomationSystem extends EventEmitter
{
	constructor(logger, files, dataManager, pluginName, configPath)
	{
		super();

		super.setMaxListeners(512);

		this.logger = logger;
		this.pluginName = pluginName;

		this.RouteManager = new RouteManager(logger, configPath);
		this.LogikEngine = new LogikEngine(logger, files, dataManager, this);
	}

	setInputStream(stream, callback)
	{
		super.on(stream, (reciever, values) => callback(reciever, values));
	}

	setOutputStream(stream, reciever, values)
	{
		super.emit(stream, reciever, values);

		this.logger.debug('>>> ' + stream + ' ' + JSON.stringify(reciever) + ' ' + JSON.stringify(values));
	}
}