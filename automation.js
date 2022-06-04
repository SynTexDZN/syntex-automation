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

		this.TypeManager = platform.TypeManager;

		this.manager = manager;
		
		this.files.readFile('automation/automation-lock.json').then((data) => {

			if(data != null)
			{
				this.eventLock = data.eventLock || [];
				this.positiveFired = data.positiveFired || [];
				this.negativeFired = data.negativeFired || [];
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
				if(this.automation[i].trigger != null)
				{
					for(const j in this.automation[i].trigger)
					{
						if(this.automation[i].trigger[j].value != null)
						{
							this.automation[i].trigger[j].value = JSON.parse(this.automation[i].trigger[j].value);
						}

						if(this.automation[i].trigger[j].hue != null)
						{
							this.automation[i].trigger[j].hue = JSON.parse(this.automation[i].trigger[j].hue);
						}

						if(this.automation[i].trigger[j].saturation != null)
						{
							this.automation[i].trigger[j].saturation = JSON.parse(this.automation[i].trigger[j].saturation);
						}

						if(this.automation[i].trigger[j].brightness != null)
						{
							this.automation[i].trigger[j].brightness = JSON.parse(this.automation[i].trigger[j].brightness);
						}
					}
				}

				if(this.automation[i].condition != null)
				{
					for(const j in this.automation[i].condition)
					{
						if(this.automation[i].condition[j].value != null)
						{
							this.automation[i].condition[j].value = JSON.parse(this.automation[i].condition[j].value);
						}

						if(this.automation[i].condition[j].hue != null)
						{
							this.automation[i].condition[j].hue = JSON.parse(this.automation[i].condition[j].hue);
						}

						if(this.automation[i].condition[j].saturation != null)
						{
							this.automation[i].condition[j].saturation = JSON.parse(this.automation[i].condition[j].saturation);
						}

						if(this.automation[i].condition[j].brightness != null)
						{
							this.automation[i].condition[j].brightness = JSON.parse(this.automation[i].condition[j].brightness);
						}
					}
				}

				if(this.automation[i].result != null)
				{
					for(const j in this.automation[i].result)
					{
						if(this.automation[i].result[j].value != null)
						{
							this.automation[i].result[j].value = JSON.parse(this.automation[i].result[j].value);
						}

						if(this.automation[i].result[j].hue != null)
						{
							this.automation[i].result[j].hue = JSON.parse(this.automation[i].result[j].hue);
						}

						if(this.automation[i].result[j].saturation != null)
						{
							this.automation[i].result[j].saturation = JSON.parse(this.automation[i].result[j].saturation);
						}

						if(this.automation[i].result[j].brightness != null)
						{
							this.automation[i].result[j].brightness = JSON.parse(this.automation[i].result[j].brightness);
						}
					}
				}
			}
		}
		catch(e)
		{
			this.this.logger.log('error', 'automation', 'Automation', 'Automation %json_parse_error%!', e);
		}
	}

	runAutomation(id, letters, state)
	{
		return new Promise((resolve) => {
		
			if(this.ready)
			{
				for(let i = 0; i < this.automation.length; i++)
				{
					if(this.eventLock.includes(this.automation[i].id))
					{
						for(var j = 0; j < this.automation[i].trigger.length; j++)
						{
							if(this.automation[i].trigger[j].id == id && this.automation[i].trigger[j].letters == letters)
							{
								var index = this.eventLock.indexOf(this.automation[i].id);

								if(this.automation[i].trigger[j].operation == '>' && this.negativeFired.includes(this.automation[i].trigger[j].id))
								{
									if(state.value != null && this.automation[i].trigger[j].value != null && state.value < this.automation[i].trigger[j].value
									|| state.hue != null && this.automation[i].trigger[j].hue != null && state.hue < this.automation[i].trigger[j].hue
									|| state.saturation != null && this.automation[i].trigger[j].saturation != null && state.saturation < this.automation[i].trigger[j].saturation
									|| state.brightness != null && this.automation[i].trigger[j].brightness != null && state.brightness < this.automation[i].trigger[j].brightness)
									{
										this.eventLock.splice(index, 1);

										this.logger.debug('Automation [' + this.automation[i].name + '] %automation_lower% ' + this.automation[i].id);
									}
								}

								if(this.automation[i].trigger[j].operation == '<' && this.positiveFired.includes(this.automation[i].trigger[j].id))
								{
									if(state.value != null && this.automation[i].trigger[j].value != null && state.value > this.automation[i].trigger[j].value
									|| state.hue != null && this.automation[i].trigger[j].hue != null && state.hue > this.automation[i].trigger[j].hue
									|| state.saturation != null && this.automation[i].trigger[j].saturation != null && state.saturation > this.automation[i].trigger[j].saturation
									|| state.brightness != null && this.automation[i].trigger[j].brightness != null && state.brightness > this.automation[i].trigger[j].brightness)
									{
										this.eventLock.splice(index, 1);

										this.logger.debug('Automation [' + this.automation[i].name + '] %automation_greater% ' + this.automation[i].id);
									}
								}

								if(this.automation[i].trigger[j].operation == '=')
								{
									if(state.value != null && this.automation[i].trigger[j].value != null && state.value != this.automation[i].trigger[j].value
									|| state.hue != null && this.automation[i].trigger[j].hue != null && state.hue != this.automation[i].trigger[j].hue
									|| state.saturation != null && this.automation[i].trigger[j].saturation != null && state.saturation != this.automation[i].trigger[j].saturation
									|| state.brightness != null && this.automation[i].trigger[j].brightness != null && state.brightness != this.automation[i].trigger[j].brightness)
									{
										this.eventLock.splice(index, 1);

										this.logger.debug('Automation [' + this.automation[i].name + '] %automation_different% ' + this.automation[i].id);
									}
								}
							}
						}
					}
				}

				for(let i = 0; i < this.automation.length; i++)
				{
					if(this.automation[i].active && !this.eventLock.includes(this.automation[i].id))
					{
						this.checkTrigger(this.automation[i], id, letters, state);
					}
				}

				resolve();

				this.files.writeFile('automation/automation-lock.json', { eventLock : this.eventLock, positiveFired : this.positiveFired, negativeFired : this.negativeFired });
			}
			else
			{
				resolve();
			}
		});
	}

	checkTrigger(automation, id, letters, state)
	{
		var trigger = null;

		for(var i = 0; i < automation.trigger.length; i++)
		{
			if(automation.trigger[i].id == id && automation.trigger[i].letters == letters)
			{
				if(automation.trigger[i].operation == '>')
				{
					if(state.value != null && automation.trigger[i].value != null && state.value > automation.trigger[i].value
					|| state.hue != null && automation.trigger[i].hue != null && state.hue > automation.trigger[i].hue
					|| state.saturation != null && automation.trigger[i].saturation != null && state.saturation > automation.trigger[i].saturation
					|| state.brightness != null && automation.trigger[i].brightness != null && state.brightness > automation.trigger[i].brightness)
					{
						trigger = automation.trigger[i];
					}
				}

				if(automation.trigger[i].operation == '<')
				{
					if(state.value != null && automation.trigger[i].value != null && state.value < automation.trigger[i].value
					|| state.hue != null && automation.trigger[i].hue != null && state.hue < automation.trigger[i].hue
					|| state.saturation != null && automation.trigger[i].saturation != null && state.saturation < automation.trigger[i].saturation
					|| state.brightness != null && automation.trigger[i].brightness != null && state.brightness < automation.trigger[i].brightness)
					{
						trigger = automation.trigger[i];
					}
				}

				if(automation.trigger[i].operation == '=')
				{
					if(state.value == null || automation.trigger[i].value == null || state.value == automation.trigger[i].value
					&& (state.hue == null || automation.trigger[i].hue == null || state.hue == automation.trigger[i].hue)
					&& (state.saturation == null || automation.trigger[i].saturation == null || state.saturation == automation.trigger[i].saturation)
					&& (state.brightness == null || automation.trigger[i].brightness == null || state.brightness == automation.trigger[i].brightness))
					{
						trigger = automation.trigger[i];
					}
				}
			}
		}

		if(trigger != null)
		{
			this.logger.debug('Automation [' + automation.name + '] %trigger_activated%');

			if(automation.condition != null && automation.condition.length > 0)
			{
				this.checkCondition(automation, trigger);
			}
			else
			{
				this.executeResult(automation, trigger);
			}
		}
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
		for(var i = 0; i < automation.result.length; i++)
		{
			var url = '';

			if(automation.result[i].url != null)
			{
				url = automation.result[i].url;
			}

			if(automation.result[i].id != null && automation.result[i].letters != null && automation.result[i].value != null && automation.result[i].name != null)
			{
				var state = { value : automation.result[i].value };

				if(automation.result[i].hue != null)
				{
					state.hue = automation.result[i].hue;
				}

				if(automation.result[i].saturation != null)
				{
					state.saturation = automation.result[i].saturation;
				}

				if(automation.result[i].brightness != null)
				{
					state.brightness = automation.result[i].brightness;
				}

				if((state = this.TypeManager.validateUpdate(automation.result[i].id, automation.result[i].letters, state)) != null)
				{
					if(this.TypeManager.letterToType(automation.result[i].letters[0]) == 'statelessswitch')
					{
						state.event = state.value;
						state.value = 0;
					}

					if(this.manager.pluginName != automation.result[i].plugin && automation.result[i].plugin != null && this.manager.RouteManager.getPort(automation.result[i].plugin) != null)
					{
						let theRequest = {
							url : 'http://' + (automation.result[i].bridge || '127.0.0.1') + ':' + this.manager.RouteManager.getPort(automation.result[i].plugin) + '/devices?id=' + automation.result[i].id + '&type=' + this.TypeManager.letterToType(automation.result[i].letters[0]) + '&counter=' + automation.result[i].letters[1] + '&value=' + state.value,
							timeout : 10000
						};

						if(state.hue != null)
						{
							theRequest.url += '&hue=' + state.hue;
						}

						if(state.saturation != null)
						{
							theRequest.url += '&saturation=' + state.saturation;
						}

						if(state.brightness != null)
						{
							theRequest.url += '&brightness=' + state.brightness;
						}

						this.fetchRequest(theRequest, automation.name, automation.result[i]);
					}
					else
					{
						this.manager.setOutputStream('SynTexAutomation', { id : automation.result[i].id, letters : automation.result[i].letters }, state);
					}
				}
				else
				{
					this.logger.log('error', automation.result[i].id, automation.result[i].letters, '[' + automation.result[i].name + '] %update_error%! ( ' + automation.result[i].id + ' )');
				}
			}

			if(url != '')
			{
				let theRequest = {
					url : url,
					timeout : 10000
				};

				this.fetchRequest(theRequest, automation.name, automation.result[i]);
			}

			if(!this.eventLock.includes(automation.id))
			{
				this.eventLock.push(automation.id);
			}

			if(trigger.operation == '<')
			{
				if(!this.negativeFired.includes(trigger.id))
				{
					this.negativeFired.push(trigger.id);

					let index = this.positiveFired.indexOf(trigger.id);

					if(index > -1)
					{
						this.positiveFired.splice(index, 1);
					}
				}
			}
			else if(trigger.operation == '>')
			{
				if(!this.positiveFired.includes(trigger.id))
				{
					this.positiveFired.push(trigger.id);

					let index = this.negativeFired.indexOf(trigger.id);

					if(index > -1)
					{
						this.negativeFired.splice(index, 1);
					}
				}
			}
		}

		this.files.writeFile('automation/automation-lock.json', { eventLock : this.eventLock, positiveFired : this.positiveFired, negativeFired : this.negativeFired }).then((response) => {

			if(response.success)
			{
				this.logger.log('success', trigger.id, trigger.letters, '[' + trigger.name + '] %automation_executed[0]% [' + automation.name + '] %automation_executed[1]%!');
			}
		});
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
};