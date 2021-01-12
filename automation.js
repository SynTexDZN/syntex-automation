let TypeManager = require('./type-manager');

const request = require('request'), store = require('json-fs-store');

var logger, storage, dataManager, eventManager;
var eventLock = [], positiveFired = [], negativeFired = [], ready = false;

module.exports = class Automation
{
	constructor(Logger, storagePath, DataManager, EventManager)
	{
		logger = Logger;
		dataManager = DataManager;
		eventManager = EventManager;
		
		TypeManager = new TypeManager(logger);

		if(storagePath != null)
		{
			storage = store(storagePath);

			storage.load('automation-lock', (err, obj) => {

				if(!obj || err)
				{
					logger.log('error', 'bridge', 'Bridge', 'Automation-Lock.json %read_error%! ' + err);
				}
				else
				{
					eventLock = obj.eventLock || [];
					positiveFired = obj.positiveFired || [];
					negativeFired = obj.negativeFired || [];
				}
	
				this.loadAutomation();
			});
		}
	}

	loadAutomation()
	{
		return new Promise((resolve) => {

			storage.load('automation', (err, obj) => {  

				if(!obj || err)
				{
					this.automation = [];

					logger.log('warn', 'bridge', 'Bridge', '%automation_load_error%!');

					resolve(false);
				}
				else
				{
					this.automation = obj.automation;

					logger.log('success', 'bridge', 'Bridge', '%automation_load_success%!');

					resolve(true);
				}

				ready = true;
			});
		});
	}

	runAutomation(id, letters, value)
	{
		if(ready)
		{
			value = value.toString();
			
			for(var i = 0; i < this.automation.length; i++)
			{
				if(eventLock.includes(this.automation[i].id))
				{
					for(var j = 0; j < this.automation[i].trigger.length; j++)
					{
						if(this.automation[i].trigger[j].id == id && this.automation[i].trigger[j].letters == letters)
						{
							var index = eventLock.indexOf(this.automation[i].id);

							if(this.automation[i].trigger[j].operation == '>' && parseFloat(value) < parseFloat(this.automation[i].trigger[j].value) && negativeFired.includes(this.automation[i].trigger[j].id))
							{
								eventLock.splice(index, 1);

								logger.debug('Automation [' + this.automation[i].name + '] Unterschritten ' + this.automation[i].id);
							}

							if(this.automation[i].trigger[j].operation == '<' && parseFloat(value) > parseFloat(this.automation[i].trigger[j].value) && positiveFired.includes(this.automation[i].trigger[j].id))
							{
								eventLock.splice(index, 1);

								logger.debug('Automation [' + this.automation[i].name + '] Überschritten ' + this.automation[i].id);
							}

							if(this.automation[i].trigger[j].operation == '=' && value != this.automation[i].trigger[j].value)
							{
								eventLock.splice(index, 1);

								logger.debug('Automation [' + this.automation[i].name + '] Ungleich ' + this.automation[i].id);
							}
						}
					}
				}
			}

			storage.add({ id : 'automation-lock', eventLock : eventLock, positiveFired : positiveFired, negativeFired : negativeFired }, (err) => {

				if(err)
				{
					logger.log('error', 'bridge', 'Bridge', 'Automation-Lock.json %update_error%! ' + err);
				}
			});

			for(var i = 0; i < this.automation.length; i++)
			{
				if(this.automation[i].active && !eventLock.includes(this.automation[i].id))
				{
					checkTrigger(this.automation[i], id, letters, value.toString());
				}
			}
		}
	}
};

async function checkTrigger(automation, id, letters, value)
{
	var trigger = null;

	for(var i = 0; i < automation.trigger.length; i++)
	{
		if(automation.trigger[i].id == id && automation.trigger[i].letters == letters)
		{
			if(automation.trigger[i].operation == '>' && parseFloat(value) > parseFloat(automation.trigger[i].value))
			{
				trigger = automation.trigger[i];
			}

			if(automation.trigger[i].operation == '<' && parseFloat(value) < parseFloat(automation.trigger[i].value))
			{
				trigger = automation.trigger[i];
			}

			if(automation.trigger[i].operation == '=' && value == automation.trigger[i].value)
			{
				trigger = automation.trigger[i];
			}
		}
	}

	if(trigger != null)
	{
		logger.debug('Trigger Ausgelöst');

		if(automation.condition && automation.condition.length > 0)
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
		//var value = platform.readAccessoryService(automation.condition[i].id, automation.condition[i].letters, true);

		var value = dataManager.readAccessoryService(automation.condition[i].id, automation.condition[i].letters);

		if(value != null)
		{
			value = value.toString();

			if(automation.condition[i].operation == '>' && parseFloat(value) > parseFloat(automation.condition[i].value))
			{
				condition++;
			}

			if(automation.condition[i].operation == '<' && parseFloat(value) < parseFloat(automation.condition[i].value))
			{
				condition++;
			}

			if(automation.condition[i].operation == '=' && value == automation.condition[i].value)
			{
				condition++;
			}
		}
	}

	if(condition > 0 && ((!automation.combination || automation.combination == 'ALL') && condition >= automation.condition.length) || automation.condition.combination == 'ONE')
	{
		logger.debug('Condition Erfüllt');

		executeResult(automation, trigger);
	}
}

async function executeResult(automation, trigger)
{
	for(var i = 0; i < automation.result.length; i++)
	{
		var url = '';

		if(automation.result[i].url)
		{
			url = automation.result[i].url;
		}

		if(automation.result[i].id && automation.result[i].letters && automation.result[i].value && automation.result[i].name)
		{
			var state = null;

			if((state = TypeManager.validateUpdate(automation.result[i].id, automation.result[i].letters, { value : automation.result[i].value })) != null)
			{
				if(TypeManager.letterToType(automation.result[i].letters[0]) == 'statelessswitch')
				{
					state.event = parseInt(automation.result[i].value);
					state.value = 0;
				}

				if(eventManager.pluginName != automation.result[i].plugin && automation.result[i].plugin != null && eventManager.RouteManager.getPort(automation.result[i].plugin) != null)
				{
					var theRequest = {
						method : 'GET',
						url : 'http://' + (automation.result[i].bridge || '127.0.0.1') + ':' + eventManager.RouteManager.getPort(automation.result[i].plugin) + '/devices?id=' + automation.result[i].id + '&type=' + TypeManager.letterToType(automation.result[i].letters[0]) + '&counter=' + automation.result[i].letters[1] + '&value=' + automation.result[i].value,
						timeout : 10000
					};

					fetchRequest(theRequest, automation.name);
				}
				else
				{
					eventManager.setOutputStream('SynTexAutomation', { id : automation.result[i].id, letters : automation.result[i].letters }, { value : JSON.parse(automation.result[i].value) });
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
				method : 'GET',
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

	storage.add({ id : 'automation-lock', eventLock : eventLock, positiveFired : positiveFired, negativeFired : negativeFired }, (err) => {
			
		if(err)
		{
			logger.log('error', 'bridge', 'Bridge', 'Automation-Lock.json %update_error%! ' + err);
		}
	});

	logger.log('success', trigger.id, trigger.letters, '[' + trigger.name + '] %automation_executed[0]% [' + automation.name + '] %automation_executed[1]%!');
}

function fetchRequest(theRequest, name)
{
	request(theRequest, (err, response, body) => {

		var statusCode = response && response.statusCode ? response.statusCode : -1;

		if(err || statusCode != 200)
		{
			logger.log('error', 'bridge', 'Bridge', '[' + name + '] %request_result[0]% [' + theRequest.url + '] %request_result[1]% [' + statusCode + '] %request_result[2]%: [' + (body || '') + '] ' + (err ? err : ''));
		}
		
	});
}