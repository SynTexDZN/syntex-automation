let LogikEngine = require('./src/automation'), RouteManager = require('./src/route-manager');

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
		this.LogikEngine = new LogikEngine(platform, this);
    }

    setInputStream(stream, sender, callback)
	{
		super.on(stream, (destination, state) => {
			
			if(sender.id == destination.id && sender.letters == destination.letters)
			{
				callback(state);

				this.logger.debug('<<< ' + stream + ' [' + JSON.stringify(destination) + '] ' + JSON.stringify(state));
			}
		});
	}

	setOutputStream(stream, destination, state)
	{
		super.emit(stream, destination, state);

		this.logger.debug('>>> ' + stream + ' [' + JSON.stringify(destination) + '] ' + JSON.stringify(state));
	}
}