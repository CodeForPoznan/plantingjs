function Planting(args) {
    var Core = Planting.module('core');
    var SessionData = Planting.module('sessionData');
    var ManifestoData = Planting.module('manifestoData');
    var Plant = Planting.module('plant');
    var mapsLoader = this._initGoogleMaps(args.googleApiKey);
    var initDefer = $.Deferred();

    this._initializeEventEmmiter();
    this._initializeHelpers();
    this.options = args;
    this.data = {
        session: new SessionData.Model(null, {
            app: this
        }),
        manifesto: new ManifestoData.Model(null, {
            url: args.manifestoUrl,
            app: this
        })
    };
    this.setState(Planting.State.INITING);
    $.when(this.manifesto().fetch(), mapsLoader)
        .done(function() {
            this._initializeViews();
            initDefer.resolve();
        }.bind(this));
    this.initDefer = initDefer.promise();
};

Planting.prototype._initializeEventEmmiter = function() {
    _.extend(this, _.clone(Backbone.Events));
};

Planting.prototype._initializeHelpers = function() {
    _.extend(this, {
        _state: null,

        session: function() {

            return this.data.session;
        },
        manifesto: function() {

            return this.data.manifesto;
        },

        setState: function(state) {
            var prevState = this._state;
            
            this._state = state;
            this.trigger(Planting.Event.STATE_CHANGED, this._state, prevState);

            return this;
        },

        getState: function() {

            return this._state;
        }
    });
};

Planting.prototype._initGoogleMaps = function(key) {
    var defer = $.Deferred();

    $.getScript('https://www.google.com/jsapi')
        .then(function() {
            google.load('maps', '3', {
                other_params: 'key=' + key,
                callback: defer.resolve.bind(defer)
            });
        });

    return defer.promise();
};
Planting.prototype._initializeViews = function() {
    var Main = Planting.module('main');
    var Plant = Planting.module('plant');
    var Toolbox = Planting.module('toolbox');
    var Map = Planting.module('map');
    var LayersManager = Planting.module('layersManager');

    this.main = new Main.View.Main({
        el: this.options.container,
        manifesto: this.manifesto().toJSON(),
        app: this
    });
    this.overlay = new Plant.View.Overlay({
        el: this.main.el.querySelector('.plantingjs-overlay'),
        collection: this.session().objects(),
        app: this
    });
    this.toolbox = new Toolbox.View.Sidebar({
        el: this.main.el.querySelector('.plantingjs-toolbox'),
        app: this
    });
    this.map = new Map.View({
        el: this.main.el.querySelector('.plantingjs-google'),
        model: this.manifesto(),
        app: this
    });
    this.layersManager = new LayersManager.View.Menu({
        $parent: this.main.$proxy,
        collection: this.session().objects(),
        app: this
    });

};

Planting.prototype.initPlant = function(objects) {
    this.main.dialog.close();
    _.each(objects, function(object) {

        this.session().objects().add(object, {
            parse: true,
            app: this
        });
    }, this);
};

Planting.prototype.initViewer = function(options) {
    var panoOptions = {
        position: {
            lat: options.lat,
            lng: options.lng
        },
        pov: {
            heading: options.heading,
            pitch: options.pitch,
            zoom: options.zoom
        }
    };
    var objects = options.objects;

    this.initDefer
        .then(function() {

            this.setState(Planting.State.VIEWER);
            this.map.initializeViewer(panoOptions);

            if (objects &&
                objects.length) {

                this.initPlant(objects);
            }
        }.bind(this));
};

_.extend(Planting, {
    module: function() {
        var _modules = {};

        return function(name) {
            name = name.toUpperCase();

            if (_modules[name]) {
                return _modules[name];
            }

            return _modules[name] = {
                Model: {},
                Collection: {},
                View: {}
            };
        };
    }(),

    State: {
        INITING: 'initing',
        MAP: 'map',
        PLANTING: 'planting',
        VIEWER: 'viewer'
    },

    Event: {
        VISIBLE_CHANGED: 'visible_changed',
        START_PLANTING: 'start_planting',
        SAVE_REQUEST: 'save_request',
        MANIFESTO_INITED: 'manifesto_inited',
        STATE_CHANGED: 'state_changed'
    }
});