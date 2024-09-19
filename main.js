let LogikEngine = require('./src/automation'), RouteManager = require('./src/route-manager');

module.exports = class AutomationSystem
{
	constructor(platform)
	{
		this.pluginName = platform.pluginName;
		this.logger = platform.logger;

		this.RouteManager = new RouteManager(platform);
		this.LogikEngine = new LogikEngine(platform, this);
	}
}