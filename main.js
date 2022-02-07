let LogikEngine = require('./automation'), RouteManager = require('./route-manager');

const EventEmitter = require('events');

module.exports = class AutomationSystem extends EventEmitter
{
	constructor(platform)
	{
		super();

		super.setMaxListeners(512);

		this.pluginName = platform.pluginName;
		this.logger = platform.logger;

		this.RouteManager = new RouteManager(platform.logger, platform.files, platform.api.user.storagePath());
		this.LogikEngine = new LogikEngine(platform.logger, platform.files, platform, this);
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