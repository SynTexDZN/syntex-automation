let TypeManager = require('./type-manager');

const axios = require('axios');

var logger, files, dataManager, eventManager;
var eventLock = [], positiveFired = [], negativeFired = [], ready = false;

module.exports = class Automation
{
	constructor(Logger, Files, DataManager, EventManager)
	{
		logger = Logger;
		files = Files;
		dataManager = DataManager;
		eventManager = EventManager;
		
		TypeManager = new TypeManager(logger);

		files.readFile('automation/automation-lock.json').then((data) => {

			if(data != null)
			{
				eventLock = data.eventLock || [];
				positiveFired = data.positiveFired || [];
				negativeFired = data.negativeFired || [];
			}

			this.loadAutomation();
		});
	}

	loadAutomation()
	{
		return new Promise((resolve) => {

			files.readFile('automation/automation.json').then((data) => {

				if(data != null)
				{
					this.automation = data;

					resolve(true);

					this.parseAutomation();

					logger.log('success', 'bridge', 'Bridge', '%automation_load_success%!');
				}
				else
				{
					this.automation = [];

					resolve(false);

					logger.log('warn', 'bridge', 'Bridge', '%automation_load_error%!');
				}

				ready = true;
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
			this.logger.log('error', 'bridge', 'Bridge', 'Automation %json_parse_error%!', e);
		}
	}

	runAutomation(id, letters, state)
	{
		return new Promise((resolve) => {
		
			if(ready)
			{
				for(var i = 0; i < this.automation.length; i++)
				{
					if(eventLock.includes(this.automation[i].id))
					{
						for(var j = 0; j < this.automation[i].trigger.length; j++)
						{
							if(this.automation[i].trigger[j].id == id && this.automation[i].trigger[j].letters == letters)
							{
								var index = eventLock.indexOf(this.automation[i].id);

								if(this.automation[i].trigger[j].operation == '>' && negativeFired.includes(this.automation[i].trigger[j].id))
								{
									if(state.value != null && this.automation[i].trigger[j].value != null && state.value < this.automation[i].trigger[j].value
									|| state.hue != null && this.automation[i].trigger[j].hue != null && state.hue < this.automation[i].trigger[j].hue
									|| state.saturation != null && this.automation[i].trigger[j].saturation != null && state.saturation < this.automation[i].trigger[j].saturation
									|| state.brightness != null && this.automation[i].trigger[j].brightness != null && state.brightness < this.automation[i].trigger[j].brightness)
									{
										eventLock.splice(index, 1);

										logger.debug('Automation [' + this.automation[i].name + '] Unterschritten ' + this.automation[i].id);
									}
								}

								if(this.automation[i].trigger[j].operation == '<' && positiveFired.includes(this.automation[i].trigger[j].id))
								{
									if(state.value != null && this.automation[i].trigger[j].value != null && state.value > this.automation[i].trigger[j].value
									|| state.hue != null && this.automation[i].trigger[j].hue != null && state.hue > this.automation[i].trigger[j].hue
									|| state.saturation != null && this.automation[i].trigger[j].saturation != null && state.saturation > this.automation[i].trigger[j].saturation
									|| state.brightness != null && this.automation[i].trigger[j].brightness != null && state.brightness > this.automation[i].trigger[j].brightness)
									{
										eventLock.splice(index, 1);

										logger.debug('Automation [' + this.automation[i].name + '] Überschritten ' + this.automation[i].id);
									}
								}

								if(this.automation[i].trigger[j].operation == '=')
								{
									if(state.value != null && this.automation[i].trigger[j].value != null && state.value != this.automation[i].trigger[j].value
									|| state.hue != null && this.automation[i].trigger[j].hue != null && state.hue != this.automation[i].trigger[j].hue
									|| state.saturation != null && this.automation[i].trigger[j].saturation != null && state.saturation != this.automation[i].trigger[j].saturation
									|| state.brightness != null && this.automation[i].trigger[j].brightness != null && state.brightness != this.automation[i].trigger[j].brightness)
									{
										eventLock.splice(index, 1);

										logger.debug('Automation [' + this.automation[i].name + '] Ungleich ' + this.automation[i].id);
									}
								}
							}
						}
					}
				}

				for(var i = 0; i < this.automation.length; i++)
				{
					if(this.automation[i].active && !eventLock.includes(this.automation[i].id))
					{
						checkTrigger(this.automation[i], id, letters, state);
					}
				}

				resolve();

				files.writeFile('automation/automation-lock.json', { eventLock : eventLock, positiveFired : positiveFired, negativeFired : negativeFired });
			}
			else
			{
				resolve();
			}
		});
	}
};

function checkTrigger(automation, id, letters, state)
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
		logger.debug('Automation [' + automation.name + '] Trigger Ausgelöst');

		if(automation.condition != null && automation.condition.length > 0)
		{
			checkCondition(automation, trigger);
		}
		else
		{
			executeResult(automation, trigger);
		}
	}
}

async function checkCondition(automation, trigger)
{
	var condition = 0;

	for(var i = 0; i < automation.condition.length; i++)
	{
		var state = null;

		if(eventManager.pluginName != automation.condition[i].plugin && automation.condition[i].plugin != null && eventManager.RouteManager.getPort(automation.condition[i].plugin) != null)
		{
			var theRequest = {
				url : 'http://' + (automation.condition[i].bridge || '127.0.0.1') + ':' + eventManager.RouteManager.getPort(automation.condition[i].plugin) + '/devices?id=' + automation.condition[i].id + '&type=' + TypeManager.letterToType(automation.condition[i].letters[0]) + '&counter=' + automation.condition[i].letters[1],
				timeout : 10000
			};

			try
			{
				state = await fetchRequest(theRequest, automation.name);
			}
			catch(e)
			{
				this.logger.log('error', 'bridge', 'Bridge', 'Condition Request %json_parse_error%!', e);
			}
		}
		else
		{
			state = dataManager.readAccessoryService(automation.condition[i].id, automation.condition[i].letters, true);	
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
		logger.debug('Automation [' + automation.name + '] Condition Erfüllt');

		executeResult(automation, trigger);
	}
}

function executeResult(automation, trigger)
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

			if((state = TypeManager.validateUpdate(automation.result[i].id, automation.result[i].letters, state)) != null)
			{
				if(TypeManager.letterToType(automation.result[i].letters[0]) == 'statelessswitch')
				{
					state.event = state.value;
					state.value = 0;
				}

				if(eventManager.pluginName != automation.result[i].plugin && automation.result[i].plugin != null && eventManager.RouteManager.getPort(automation.result[i].plugin) != null)
				{
					var theRequest = {
						url : 'http://' + (automation.result[i].bridge || '127.0.0.1') + ':' + eventManager.RouteManager.getPort(automation.result[i].plugin) + '/devices?id=' + automation.result[i].id + '&type=' + TypeManager.letterToType(automation.result[i].letters[0]) + '&counter=' + automation.result[i].letters[1] + '&value=' + state.value,
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

					fetchRequest(theRequest, automation.name);
				}
				else
				{
					eventManager.setOutputStream('SynTexAutomation', { id : automation.result[i].id, letters : automation.result[i].letters }, state);
				}
			}
			else
			{
				logger.log('error', automation.result[i].id, automation.result[i].letters, '[' + automation.result[i].value + '] %invalid-value%! ( ' + automation.result[i].id + ' )');
			}
		}

		if(url != '')
		{
			var theRequest = {
				url : url,
				timeout : 10000
			};

			fetchRequest(theRequest, automation.name);
		}

		if(!eventLock.includes(automation.id))
		{
			eventLock.push(automation.id);
		}

		if(trigger.operation == '<')
		{
			if(!negativeFired.includes(trigger.id))
			{
				negativeFired.push(trigger.id);

				var index = positiveFired.indexOf(trigger.id);

				if(index > -1)
				{
					positiveFired.splice(index, 1);
				}
			}
		}
		else if(trigger.operation == '>')
		{
			if(!positiveFired.includes(trigger.id))
			{
				positiveFired.push(trigger.id);

				var index = negativeFired.indexOf(trigger.id);

				if(index > -1)
				{
					negativeFired.splice(index, 1);
				}
			}
		}
	}

	files.writeFile('automation/automation-lock.json', { eventLock : eventLock, positiveFired : positiveFired, negativeFired : negativeFired }).then((success) => {

		logger.log('success', trigger.id, trigger.letters, '[' + trigger.name + '] %automation_executed[0]% [' + automation.name + '] %automation_executed[1]%!');
	});
}

function fetchRequest(theRequest, name)
{
	return new Promise((resolve) => {

		axios.get(theRequest.url, theRequest).then((response) => resolve(response.data)).catch((err) => {

			resolve(null);

			logger.log('error', 'bridge', 'Bridge', '[' + name + '] %request_result[0]% [' + theRequest.url + '] %request_result[1]% [' + (err.response != null ? err.response.status : -1) + '] %request_result[2]%: [' + (err.response != null ? err.response.data : '') + '] ', err);
		});
	});
}