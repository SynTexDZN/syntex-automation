const axios = require('axios');

module.exports = class Automation
{
	constructor(platform, manager)
	{
		this.ready = false;

		this.eventLock = [];
		this.positiveFired = [];
		this.negativeFired = [];

		this.platform = platform;

		this.logger = platform.logger;
		this.files = platform.files;

		this.ContextManager = platform.ContextManager;
		this.TypeManager = platform.TypeManager;

		this.manager = manager;
		
		this.files.readFile('automation/automation-lock.json').then((data) => {

			if(data != null)
			{
				this.timeLock = data.timeLock || {};
			}

			this.loadAutomation();
		});
	}

	loadAutomation()
	{
		return new Promise((resolve) => {

			this.files.readFile('automation/automation.json').then((data) => {

				if(data != null)
				{
					this.automation = data;

					resolve(true);

					this.parseAutomation();

					this.logger.log('success', 'automation', 'Automation', '%automation_load_success%!');
				}
				else
				{
					this.automation = [];

					resolve(false);

					this.logger.log('warn', 'automation', 'Automation', '%automation_load_error%!');
				}

				this.ready = true;
			});
		});
	}

	parseAutomation()
	{
		try
		{
			for(const i in this.automation)
			{
				if(this.automation[i].trigger != null && this.automation[i].trigger.groups != null)
				{
					for(const j in this.automation[i].trigger.groups)
					{
						if(this.automation[i].trigger.groups[j].blocks != null)
						{
							for(const k in this.automation[i].trigger.groups[j].blocks)
							{
								if(this.automation[i].trigger.groups[j].blocks[k].state != null)
								{
									if(this.automation[i].trigger.groups[j].blocks[k].state.value != null)
									{
										this.automation[i].trigger.groups[j].blocks[k].state.value = JSON.parse(this.automation[i].trigger.groups[j].blocks[k].state.value);
									}

									if(this.automation[i].trigger.groups[j].blocks[k].state.hue != null)
									{
										this.automation[i].trigger.groups[j].blocks[k].state.hue = JSON.parse(this.automation[i].trigger.groups[j].blocks[k].state.hue);
									}

									if(this.automation[i].trigger.groups[j].blocks[k].state.saturation != null)
									{
										this.automation[i].trigger.groups[j].blocks[k].state.saturation = JSON.parse(this.automation[i].trigger.groups[j].blocks[k].state.saturation);
									}

									if(this.automation[i].trigger.groups[j].blocks[k].state.brightness != null)
									{
										this.automation[i].trigger.groups[j].blocks[k].state.brightness = JSON.parse(this.automation[i].trigger.groups[j].blocks[k].state.brightness);
									}
								}
							}
						}
					}
				}

				if(this.automation[i].result != null)
				{
					for(const j in this.automation[i].result)
					{
						if(this.automation[i].result[j].state.value != null)
						{
							this.automation[i].result[j].state.value = JSON.parse(this.automation[i].result[j].state.value);
						}

						if(this.automation[i].result[j].state.hue != null)
						{
							this.automation[i].result[j].state.hue = JSON.parse(this.automation[i].result[j].state.hue);
						}

						if(this.automation[i].result[j].state.saturation != null)
						{
							this.automation[i].result[j].state.saturation = JSON.parse(this.automation[i].result[j].state.saturation);
						}

						if(this.automation[i].result[j].state.brightness != null)
						{
							this.automation[i].result[j].state.brightness = JSON.parse(this.automation[i].result[j].state.brightness);
						}
					}
				}
			}
		}
		catch(e)
		{
			this.logger.log('error', 'automation', 'Automation', 'Automation %json_parse_error%!', e);
		}
	}

	runAutomation(service, state)
	{
		return new Promise((resolve) => {
		
			if(this.ready)
			{
				for(const i in this.automation)
				{
					if(this.automation[i].active && (this.timeLock[this.automation[i].id] == null || new Date().getTime() >= this.timeLock[this.automation[i].id]))
					{
						this.checkTrigger(this.automation[i], service, state);
					}
				}
			}
			
			resolve();
		});
	}

	async checkTrigger(automation, service)
	{
		const TRIGGER = (blocks, logic) => {

			return new Promise((resolve) => {

				var promiseArray = [];

				for(const i in blocks)
				{
					promiseArray.push(new Promise((callback) => this._getState(automation, blocks[i]).then((state) => callback({ block : blocks[i], state : state || {} }))));
				}
				
				Promise.all(promiseArray).then((result) => {

					if(logic == 'AND' && AND(result))
					{
						resolve(true);
					}
					else if(logic == 'OR' && OR(result))
					{
						resolve(true);
					}
					else
					{
						resolve(false);
					}
				});
			});
		};

		const LOGIC = (block, state) => {

			var success = false;

			if(block.operation == '>')
			{
				if(state.value != null && block.state.value != null && state.value > block.state.value
				|| state.hue != null && block.state.hue != null && state.hue > block.state.hue
				|| state.saturation != null && block.state.saturation != null && state.saturation > block.state.saturation
				|| state.brightness != null && block.state.brightness != null && state.brightness > block.state.brightness)
				{
					success = true;
				}
			}

			if(block.operation == '<')
			{
				if(state.value != null && block.state.value != null && state.value < block.state.value
				|| state.hue != null && block.state.hue != null && state.hue < block.state.hue
				|| state.saturation != null && block.state.saturation != null && state.saturation < block.state.saturation
				|| state.brightness != null && block.state.brightness != null && state.brightness < block.state.brightness)
				{
					success = true;
				}
			}

			if(block.operation == '=')
			{
				if(state.value == null || block.state.value == null || state.value == block.state.value
				&& (state.hue == null || block.state.hue == null || state.hue == block.state.hue)
				&& (state.saturation == null || block.state.saturation == null || state.saturation == block.state.saturation)
				&& (state.brightness == null || block.state.brightness == null || state.brightness == block.state.brightness))
				{
					success = true;
				}
			}

			return success;
		};

		const AND = (blocks) => {

			var success = true;

			for(const i in blocks)
			{
				if(!LOGIC(blocks[i].block, blocks[i].state))
				{
					success = false;
				}
			}

			return success;
		};

		const OR = (blocks) => {

			var success = false;

			for(const i in blocks)
			{
				if(LOGIC(blocks[i].block, blocks[i].state))
				{
					success = true;
				}
			}

			return success;
		};

		const INCLUDES = (group) => {

			if(group.blocks != null)
			{
				for(const i in group.blocks)
				{
					if(group.blocks[i].id == service.id && group.blocks[i].letters == service.letters)
					{
						return true;
					}
				}
			}

			return false;
		};

		var promiseArray = [];

		if(automation.trigger != null && automation.trigger.groups != null)
		{
			for(const i in automation.trigger.groups)
			{
				if(automation.trigger.groups[i].blocks != null && automation.trigger.groups[i].logic != null && INCLUDES(automation.trigger.groups[i]))
				{
					promiseArray.push(TRIGGER(automation.trigger.groups[i].blocks, automation.trigger.groups[i].logic, service.id, service.letters));
				}
			}
		}

		Promise.all(promiseArray).then((triggers) => {

			if(automation.trigger.logic == 'AND' ? !triggers.includes(false) : automation.trigger.logic == 'OR' ? triggers.includes(true) : false)
			{
				this.logger.debug('Automation [' + automation.name + '] %trigger_activated%');

				this.executeResult(automation, service);
			}
		});
	}

	async checkCondition(automation, trigger)
	{
		var condition = 0;
	
		for(var i = 0; i < automation.condition.length; i++)
		{
			var state = null;
	
			if(this.manager.pluginName != automation.condition[i].plugin && automation.condition[i].plugin != null && this.manager.RouteManager.getPort(automation.condition[i].plugin) != null)
			{
				var theRequest = {
					url : 'http://' + (automation.condition[i].bridge || '127.0.0.1') + ':' + this.manager.RouteManager.getPort(automation.condition[i].plugin) + '/devices?id=' + automation.condition[i].id + '&type=' + this.TypeManager.letterToType(automation.condition[i].letters[0]) + '&counter=' + automation.condition[i].letters[1],
					timeout : 10000
				};
	
				try
				{
					state = await this.fetchRequest(theRequest, automation.name, automation.condition[i]);
				}
				catch(e)
				{
					this.logger.log('error', 'automation', 'Automation', 'Condition Request %json_parse_error%!', e);
				}
			}
			else
			{
				state = this.platform.readAccessoryService(automation.condition[i].id, automation.condition[i].letters, true);	
			}
	
			if(state != null)
			{
				if(automation.condition[i].operation == '>')
				{
					if(state.value != null && automation.condition[i].value != null && state.value > automation.condition[i].value
					|| state.hue != null && automation.condition[i].hue != null && state.hue > automation.condition[i].hue
					|| state.saturation != null && automation.condition[i].saturation != null && state.saturation > automation.condition[i].saturation
					|| state.brightness != null && automation.condition[i].brightness != null && state.brightness > automation.condition[i].brightness)
					{
						condition++;
					}
				}
	
				if(automation.condition[i].operation == '<')
				{
					if(state.value != null && automation.condition[i].value != null && state.value < automation.condition[i].value
					|| state.hue != null && automation.condition[i].hue != null && state.hue < automation.condition[i].hue
					|| state.saturation != null && automation.condition[i].saturation != null && state.saturation < automation.condition[i].saturation
					|| state.brightness != null && automation.condition[i].brightness != null && state.brightness < automation.condition[i].brightness)
					{
						condition++;
					}
				}
	
				if(automation.condition[i].operation == '=')
				{
					if(state.value == null || automation.condition[i].value == null || state.value == automation.condition[i].value
					&& (state.hue == null || automation.condition[i].hue == null || state.hue == automation.condition[i].hue)
					&& (state.saturation == null || automation.condition[i].saturation == null || state.saturation == automation.condition[i].saturation)
					&& (state.brightness == null || automation.condition[i].brightness == null || state.brightness == automation.condition[i].brightness))
					{
						condition++;
					}
				}
			}
		}
	
		if(condition > 0 && ((automation.combination == null || automation.combination == 'ALL') && condition >= automation.condition.length) || automation.condition.combination == 'ONE')
		{
			this.logger.debug('Automation [' + automation.name + '] %condition_fulfilled%');
	
			this.executeResult(automation, trigger);
		}
	}

	executeResult(automation, trigger)
	{
		for(const i in automation.result)
		{
			var result = automation.result[i];

			if(result.url != null)
			{
				let theRequest = {
					url : result.url,
					timeout : 10000
				};

				this.fetchRequest(theRequest, automation.name, result);

				this._automationSuccess(automation, trigger);
			}

			if(result.id != null && result.letters != null && result.state != null && result.name != null)
			{
				var state = { ...result.state };

				if((state = this.TypeManager.validateUpdate(result.id, result.letters, state)) != null)
				{
					if(this.TypeManager.letterToType(result.letters[0]) == 'statelessswitch')
					{
						state.event = state.value;
						state.value = 0;
					}

					if(result.plugin != null && this.manager.pluginName != result.plugin && this.manager.RouteManager.getPort(result.plugin) != null)
					{
						let theRequest = {
							url : 'http://' + (result.bridge || '127.0.0.1') + ':' + this.manager.RouteManager.getPort(result.plugin) + '/devices?id=' + result.id + '&type=' + this.TypeManager.letterToType(result.letters[0]) + '&counter=' + result.letters[1],
							timeout : 10000
						};

						for(const x in state)
						{
							theRequest.url += '&' + x + '=' + state[x];
						}

						this.fetchRequest(theRequest, automation.name, result);
					}
					else
					{
						this.manager.setOutputStream('SynTexAutomation', { id : result.id, letters : result.letters }, state);
					}

					this._automationSuccess(automation, trigger);
				}
				else
				{
					this.logger.log('error', result.id, result.letters, '[' + result.name + '] %update_error%! ( ' + result.id + ' )');
				}
			}
		}
	}

	fetchRequest(theRequest, name, element)
	{
		return new Promise((resolve) => {

			axios.get(theRequest.url, theRequest).then((response) => resolve(response.data)).catch((err) => {

				resolve(null);

				this.logger.log('error', element.id, element.letters, '[' + name + '] %request_result[0]% [' + theRequest.url + '] %request_result[1]% [' + (err.response != null ? err.response.status : -1) + '] %request_result[2]%: [' + (err.response != null ? err.response.data : '') + '] ', err.stack);
			});
		});
	}

	_automationSuccess(automation, trigger)
	{
		this.ContextManager.updateAutomation(trigger.id, trigger.letters, automation);

		if(automation.options != null && automation.options.timeLock != null)
		{
			this.timeLock[automation.id] = new Date().getTime() + automation.options.timeLock;

			this.files.writeFile('automation/automation-lock.json', { timeLock : this.timeLock });
		}
		
		this.logger.log('success', trigger.id, trigger.letters, '[' + trigger.name + '] %automation_executed[0]% [' + automation.name + '] %automation_executed[1]%!');
	}
	
	async _getState(automation, block)
	{
		var state = null;

		if(this.manager.pluginName != block.plugin && block.plugin != null && this.manager.RouteManager.getPort(block.plugin) != null)
		{
			var theRequest = {
				url : 'http://' + (block.bridge || '127.0.0.1') + ':' + this.manager.RouteManager.getPort(block.plugin) + '/devices?id=' + block.id + '&type=' + this.TypeManager.letterToType(block.letters[0]) + '&counter=' + block.letters[1],
				timeout : 10000
			};

			try
			{
				state = await this.fetchRequest(theRequest, automation.name, block);
			}
			catch(e)
			{
				this.logger.log('error', 'automation', 'Automation', 'Request %json_parse_error%!', e);
			}
		}
		else
		{
			state = this.platform.readAccessoryService(block.id, block.letters, true);	
		}

		return state;
	}
}