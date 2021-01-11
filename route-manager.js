const store = require('json-fs-store');

module.exports = class RouteManager
{
    constructor(configPath)
    {
        this.plugins = [];

        store(configPath).load('config', (obj, err) => {

            for(const i in obj.platforms)
            {
                if(obj.platforms[i].automationDirectory != null && obj.platforms[i].port != null)
                {
                    this.plugins.push({ ip : 'localhost', name : obj.platforms[i].name, port : obj.platforms[i].port });
                }
            }

            console.log(this.plugins);
        });
    }

    getPort(pluginName)
    {
        for(const i in this.plugins)
        {
            if(this.plugins[i].name == pluginName)
            {
                return this.plugins[i];
            }
        }

        return null;
    }
}