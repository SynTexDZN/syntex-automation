module.exports = class RouteManager
{
	constructor(logger, files, configPath)
	{
		this.plugins = [];

		this.logger = logger;
		this.files = files;

		if(configPath != null)
		{
			this.files.readFile(configPath + '/config.json').then((data) => {

				if(data != null && data.platforms != null)
				{
					for(const i in data.platforms)
					{
						if(data.platforms[i].platform != 'SynTex' && data.platforms[i].baseDirectory != null && (data.platforms[i].port != null || (data.platforms[i].options != null && data.platforms[i].options.port != null)))
						{
							this.plugins.push({ name : data.platforms[i].platform, port : (data.platforms[i].port || data.platforms[i].options.port) });
						}
					}
				}
				
			}).catch(() => {});
		}
	}

	getPort(pluginName)
	{
		if(pluginName != null)
		{
			for(const i in this.plugins)
			{
				if(this.plugins[i].name == pluginName)
				{
					return this.plugins[i].port;
				}
			}
		}

		return null;
	}
}