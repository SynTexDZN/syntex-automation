const axios = require('axios');

module.exports = class Automation
{
	constructor(platform, manager)
	{
		this.ready = false;

		this.automation = [];
		
		this.timeLock = {};
		this.stateLock = {};

		this.platform = platform;

		this.logger = platform.logger;
		this.files = platform.files;

		this.ContextManager = platform.ContextManager;
		this.EventManager = platform.EventManager;
		this.TypeManager = platform.TypeManager;

		this.manager = manager;
		
		this.loadAutomation().then((automationSuccess) => {
			
			if(automationSuccess)
			{
				this.loadLock().then((lockSuccess) => {

					if(lockSuccess)
					{
						this.initNetwork();

						this.timeInterval = setInterval(() => {
			
							var changed = false;
			
							for(const automation of this.automation)
							{
								if(automation.active && this._includesTime(automation))
								{
									if(this._checkLock(automation))
									{
										changed = true;
									}
									
									if(!this._isLocked(automation))
									{
										this.checkTrigger(automation, { name : ('0' + new Date().getHours()).slice(-2) + ':' + ('0' + new Date().getMinutes()).slice(-2) }, {});
									}
								}
							}
			
							if(changed)
							{
								this.files.writeFile('automation/automation-lock.json', { timeLock : this.timeLock, stateLock : this.stateLock });
							}

						}, 60000);

						this.logger.log('success', 'automation', 'Automation', '%automation_load_success%!');

						this.ready = true;
					}
				});
			}
		});
	}

	loadAutomation()
	{
		return new Promise((resolve) => {

			this.files.readFile('automation/automation.json').then((data) => {

				if(data != null)
				{
					this.automation = data;
				}

				resolve(data != null);

			}).catch(() => {
				
				this.logger.log('warn', 'automation', 'Automation', '%automation_load_error%!');

				resolve(false);
			});
		});
	}

	loadLock()
	{
		return new Promise((resolve) => {

			this.files.readFile('automation/automation-lock.json').then((data) => {

				if(data != null)
				{
					this.timeLock = data.timeLock || {};
					this.stateLock = data.stateLock || {};
				}

				resolve(true);

			}).catch(() => {
				
				this.logger.log('warn', 'automation', 'Automation', '%automation_load_error%!');

				resolve(false);
			});
		});
	}

	initNetwork()
	{
		if(this.EventManager != null)
		{
			this.EventManager.setInputStream('updateLock', { source : this, external : true }, (message) => {

				if(message.id != null && message.lock != null)
				{
					if(this.stateLock[message.id] == null)
					{
						this.stateLock[message.id] = {};
					}
					
					if(message.blockID != null)
					{
						if(this.stateLock[message.id].trigger == null)
						{
							this.stateLock[message.id].trigger = {};
						}
						
						this.stateLock[message.id].trigger[message.blockID] = message.lock;
					}
					else
					{
						this.stateLock[message.id].result = message.lock;
					}
				}
			});

			this.EventManager.setInputStream('updateAutomation', { source : this, external : true }, () => {

				this.loadAutomation().then((success) => {

					if(success)
					{
						this.logger.log('success', 'automation', 'Automation', '%automation_load_success%!');
					}
				});
			});
		}
	}

	runAutomation(service, state)
	{
		return new Promise((resolve) => {

			if(this.ready)
			{
				var changed = false;

				for(const automation of this.automation)
				{
					if(automation.active && this._includesBlock(automation, service.id, service.letters))
					{
						if(this._checkLock(automation, service, state))
						{
							changed = true;
						}

						if(!this._isLocked(automation))
						{
							this.checkTrigger(automation, service, state);
						}
					}
				}

				if(changed)
				{
					this.files.writeFile('automation/automation-lock.json', { timeLock : this.timeLock, stateLock : this.stateLock });
				}
			}
			
			resolve();
		});
	}

	async checkTrigger(automation, service, state)
	{
		const TRIGGER = (blocks, logic) => {

			return new Promise((resolve) => {

				var promiseArray = [];

				for(const block of blocks)
				{
					promiseArray.push(new Promise((callback) => (block.id != service.id || block.letters != service.letters ? this._getState(automation, block).then((state) => callback({ block : block, state : state || {} })) : callback({ block : block, state }))));
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

		const AND = (blocks) => {

			var success = true;

			for(const block of blocks)
			{
				if(!this._getOutput(block.block, block.state))
				{
					success = false;
				}
			}

			return success;
		};

		const OR = (blocks) => {

			var success = false;

			for(const block of blocks)
			{
				if(this._getOutput(block.block, block.state))
				{
					success = true;
				}
			}

			return success;
		};

		var promiseArray = [];

		if(automation.trigger != null && automation.trigger.groups != null)
		{
			for(const group of automation.trigger.groups)
			{
				if(group.blocks != null && group.logic != null)
				{
					promiseArray.push(TRIGGER(group.blocks, group.logic, service.id, service.letters));
				}
			}
		}

		Promise.all(promiseArray).then((triggers) => {

			if(automation.trigger.logic == 'AND' ? !triggers.includes(false) : automation.trigger.logic == 'OR' ? triggers.includes(true) : false)
			{
				if(this.timeLock[automation.id] == null || new Date().getTime() >= this.timeLock[automation.id])
				{
					if((automation.options != null && automation.options.stateLock == false) || this.stateLock[automation.id] == null || this.stateLock[automation.id].result != true)
					{
						this.logger.debug('Automation [' + automation.name + '] %trigger_activated%');

						this.executeResult(automation, service);
					}
				}
			}
			else if(this.stateLock[automation.id] != null && this.stateLock[automation.id].result == true)
			{
				this.stateLock[automation.id].result = false;

				this._updateSockets(false, automation.id);

				this.logger.debug('Automation [' + automation.name + '] %automation_different% ' + automation.id);
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
		var success = false;

		for(const block of automation.result)
		{
			if(block.url != null)
			{
				let theRequest = {
					url : block.url,
					timeout : 10000
				};

				this.fetchRequest(theRequest, automation.name, block);

				success = true;
			}

			if(block.id != null && block.letters != null && block.state != null && block.name != null)
			{
				var state = { ...block.state };

				if((state = this.TypeManager.validateUpdate(block.id, block.letters, state)) != null)
				{
					if(this.TypeManager.letterToType(block.letters[0]) == 'statelessswitch')
					{
						state.event = state.value;
						state.value = 0;
					}

					if(block.bridge != null && block.port != null)
					{
						let theRequest = {
							url : 'http://' + block.bridge + ':' + block.port + '/devices?id=' + block.id + '&type=' + this.TypeManager.letterToType(block.letters[0]) + '&counter=' + block.letters[1],
							timeout : 10000
						};

						for(const x in state)
						{
							theRequest.url += '&' + x + '=' + state[x];
						}

						this.fetchRequest(theRequest, automation.name, block);
					}
					else
					{
						this.EventManager.setOutputStream('changeHandler', { receiver : { id : block.id, letters : block.letters } }, state);
					}

					success = true;
				}
				else
				{
					this.logger.log('error', block.id, block.letters, '[' + block.name + '] %update_error%! ( ' + block.id + ' )');
				}
			}
		}

		if(success)
		{
			this._automationSuccess(automation, trigger);
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
		var changed = false;

		this.ContextManager.updateAutomation(trigger.id, trigger.letters, automation);

		if(automation.options != null && automation.options.timeLock != null)
		{
			this.timeLock[automation.id] = new Date().getTime() + automation.options.timeLock;

			changed = true;
		}

		for(const i in automation.trigger.groups)
		{
			for(const j in automation.trigger.groups[i].blocks)
			{
				if(automation.trigger.groups[i].blocks[j].options != null && automation.trigger.groups[i].blocks[j].options.stateLock == true)
				{
					if(this.stateLock[automation.id] == null)
					{
						this.stateLock[automation.id] = {};
					}

					if(this.stateLock[automation.id].trigger == null)
					{
						this.stateLock[automation.id].trigger = {};
					}

					this.stateLock[automation.id].trigger[i + '' + j] = true;

					this._updateSockets(true, automation.id, i + '' + j);

					changed = true;
				}
			}
		}

		if(automation.options == null || automation.options.stateLock == true)
		{
			if(this.stateLock[automation.id] == null)
			{
				this.stateLock[automation.id] = {};
			}

			this.stateLock[automation.id].result = true;

			this._updateSockets(true, automation.id);

			changed = true;
		}

		if(changed)
		{
			this.files.writeFile('automation/automation-lock.json', { timeLock : this.timeLock, stateLock : this.stateLock });
		}

		this.logger.log('success', trigger.id, trigger.letters, '[' + trigger.name + '] %automation_executed[0]% [' + automation.name + '] %automation_executed[1]%!');
	}
	
	async _getState(automation, block)
	{
		var state = null;

		if(block.id != null && block.letters != null)
		{
			if((block.bridge != null && block.port != null) || (block.plugin != null && this.manager.pluginName != block.plugin && this.manager.RouteManager.getPort(block.plugin) != null))
			{
				var theRequest = {
					url : 'http://' + (block.bridge || '127.0.0.1') + ':' + (block.port || this.manager.RouteManager.getPort(block.plugin)) + '/devices?id=' + block.id + '&type=' + this.TypeManager.letterToType(block.letters[0]) + '&counter=' + block.letters[1],
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
		}

		return state;
	}

	_getOutput(block, state)
	{
		if(block.time != null && block.time.includes(':') && block.operation != null)
		{
			var now = new Date(), begin = new Date(), end = new Date();

			begin.setMinutes(0);
			begin.setSeconds(0);
			begin.setMilliseconds(0);
			
			end.setMinutes(0);
			end.setSeconds(0);
			end.setMilliseconds(0);

			if(block.operation == '>')
			{
				begin.setHours(block.time.split(':')[0]);
				begin.setMinutes(block.time.split(':')[1]);

				end.setHours(24);
			}

			if(block.operation == '<')
			{
				begin.setHours(0);

				end.setHours(block.time.split(':')[0]);
				end.setMinutes(block.time.split(':')[1]);
			}

			if(block.operation == '=')
			{
				begin.setHours(block.time.split(':')[0]);
				begin.setMinutes(block.time.split(':')[1]);

				end.setHours(block.time.split(':')[0]);
				end.setMinutes(parseInt(block.time.split(':')[1]) + 1);
			}

			if(now.getTime() > begin.getTime()
			&& now.getTime() < end.getTime())
			{
				return true;
			}
		}

		if(block.id != null && block.letters != null && block.state != null && block.operation != null)
		{
			if(block.operation == '>')
			{
				if((state.value == null || block.state.value == null || state.value > block.state.value)
				&& (state.hue == null || block.state.hue == null || state.hue > block.state.hue)
				&& (state.saturation == null || block.state.saturation == null || state.saturation > block.state.saturation)
				&& (state.brightness == null || block.state.brightness == null || state.brightness > block.state.brightness))
				{
					return true;
				}
			}

			if(block.operation == '<')
			{
				if((state.value == null || block.state.value == null || state.value < block.state.value)
				&& (state.hue == null || block.state.hue == null || state.hue < block.state.hue)
				&& (state.saturation == null || block.state.saturation == null || state.saturation < block.state.saturation)
				&& (state.brightness == null || block.state.brightness == null || state.brightness < block.state.brightness))
				{
					return true;
				}
			}

			if(block.operation == '=')
			{
				if((state.value == null || block.state.value == null || state.value == block.state.value)
				&& (state.hue == null || block.state.hue == null || state.hue == block.state.hue)
				&& (state.saturation == null || block.state.saturation == null || state.saturation == block.state.saturation)
				&& (state.brightness == null || block.state.brightness == null || state.brightness == block.state.brightness))
				{
					return true;
				}
			}
		}

		return false;
	}

	_getBlocks(id)
	{
		var blocks = [];

		for(const automation of this.automation)
		{
			if((id == null || automation.id == id) && automation.trigger != null && automation.trigger.groups != null)
			{
				for(const i in automation.trigger.groups)
				{
					if(automation.trigger.groups[i].blocks != null)
					{
						for(const j in automation.trigger.groups[i].blocks)
						{
							blocks.push({ blockID : i + '' + j, ...automation.trigger.groups[i].blocks[j] });
						}
					}
				}
			}
		}

		return blocks;
	}

	_isLocked(automation)
	{
		var blocks = this._getBlocks(automation.id);

		for(const block of blocks)
		{
			if(block.options != null
			&& block.options.stateLock == true)
			{
				if(this.stateLock[automation.id] != null
				&& this.stateLock[automation.id].trigger != null
				&& this.stateLock[automation.id].trigger[block.blockID] == true)
				{
					return true;
				}
			}
		}

		return false;
	}

	_updateSockets(lock, id, blockID)
	{
		if(this.EventManager != null)
		{
			var message = { id, lock };

			if(blockID != null)
			{
				message.blockID = blockID;
			}

			this.EventManager.setOutputStream('updateLock', { sender : this }, message);
		}
	}

	_includesBlock(automation, id, letters)
	{
		var blocks = this._getBlocks(automation.id);

		for(const block of blocks)
		{
			if(block.id == id && block.letters == letters)
			{
				return true;
			}
		}

		return false;
	}

	_includesTime(automation)
	{
		var blocks = this._getBlocks(automation.id);

		for(const block of blocks)
		{
			if(block.time != null)
			{
				return true;
			}
		}

		return false;
	}

	_checkLock(automation, service = {}, state = {})
	{
		var blocks = this._getBlocks(automation.id), changed = false;

		for(const block of blocks)
		{
			if(this.stateLock[automation.id] != null
			&& this.stateLock[automation.id].trigger != null
			&& this.stateLock[automation.id].trigger[block.blockID] == true)
			{
				if((block.id == service.id && block.letters == service.letters) || block.time != null)
				{
					if(!this._getOutput(block, state))
					{
						this.stateLock[automation.id].trigger[block.blockID] = false;

						this._updateSockets(false, automation.id, block.blockID);

						if(block.operation == '<')
						{
							this.logger.debug('Automation [' + automation.name + '] %automation_greater% ' + automation.id + ' ' + block.blockID);
						}
						else if(block.operation == '>')
						{
							this.logger.debug('Automation [' + automation.name + '] %automation_lower% ' + automation.id + ' ' + block.blockID);
						}
						else
						{
							this.logger.debug('Automation [' + automation.name + '] %automation_different% ' + automation.id + ' ' + block.blockID);
						}

						changed = true;
					}
				}
			}
		}

		return changed;
	}
}