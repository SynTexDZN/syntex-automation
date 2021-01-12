const store = require('json-fs-store');

module.exports = class RouteManager
{
    constructor(logger, configPath)
    {
        this.plugins = [];
        this.logger = logger;

        if(configPath != null)
        {
            store(configPath).load('config', (err, obj) => {

                if(!obj || err)
                {
                    this.logger.log('error', 'bridge', 'Bridge', 'Config.json %read_error%!');
                }
                else
                {
                    for(const i in obj.platforms)
                    {
                        if(obj.platforms[i].automationDirectory != null && obj.platforms[i].port != null)
                        {
                            this.plugins.push({ ip : 'localhost', name : obj.platforms[i].platform, port : obj.platforms[i].port });
                        }
                    }
                }
            });
        }
    }

    getPort(pluginName)
    {
        for(const i in this.plugins)
        {
            if(this.plugins[i].name == pluginName)
            {
                return this.plugins[i].port;
            }
        }

        return null;
    }
}