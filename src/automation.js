module.exports = class AutomationSystem
{
	constructor(platform)
	{
		this.EventManager = platform.EventManager;
	}

	runAutomation(service, state)
	{
		this.EventManager.setOutputStream('runAutomation', { sender : this, verbose : false }, { service : { id : service.id, letters : service.letters, name : service.name }, state });
	}
}