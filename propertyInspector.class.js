/***
 * We'll be creating some read-only values which will
 * have their own setters and getters. Creating symbols
 * allows for easy access to them while not allowing
 * external scripts to mess with them.
 */
const mode = Symbol('mode'),
    index = Symbol('index'),
    layer = Symbol('layer'),
    name = Symbol('name');

class PropertyInspector {

    constructor() {

        /***
         * First and foremost, we capture the panes which represent
         * the different mode editing sections of the documnt.
         */
        this.modePanes = Array.from(document.querySelectorAll('section[data-mode]'));

        /***
         * We then capture the mode chooser box as well as the section
         * that contains it. It's set to hidden at the start to minimize
         * the flickering effect of the HTML property panel prior to
         * initializing.
         * We can also add the event listener to the select input, and
         * since we're creating our own private setter for the mode
         * attribute, we don't need to worry about formatting or
         * normalizing the value at this point
         */
        this.modeSelector = document.getElementById('modeSelector');
        this.modeSelect = document.getElementById('mode');
        this.modeSelect.addEventListener('change', (evt) => this.mode = evt.currentTarget.value);

        /***
         * Since we are going to be regularly accessing DOM elements in
         * order to both listen for changes as well as update their values,
         * we capture them in arrays based upon their attribute they effect.
         * This will allow us (in the future) to update a specific value
         * and have it propogate to all the input fields that represent it.
         */
        this.dom = {};
        Array.from(document.querySelectorAll('[data-attribute]')).forEach(inputField => {
            if (!this.dom[inputField.dataset.attribute]) this.dom[inputField.dataset.attribute] = [];
            this.dom[inputField.dataset.attribute].push(inputField);

            // Different input types require different listeners
            switch (inputField.constructor.name) {
                case 'HTMLSelectElement':
                    // Change occurs upon a select box updating it's value
                    inputField.addEventListener('change', evt => {
                        this[inputField.dataset.attribute] = evt.currentTarget.value;
                    });
                    break;
                case 'HTMLInputElement':
                    // keyup happens upon a keyboard keypress release
                    inputField.addEventListener('keyup', evt => {
                        this[inputField.dataset.attribute] = evt.currentTarget.value;
                    });
                    break;
            }
        });
    }

    /***
     * Simplifying the processing of information, we can specify what gets output
     * when "this" is converted to a JSON. Namely, we only want to send the configuration
     * of the current properties, not the methods or private attributes.
     */
    toJSON() {
        return {
            mode : this.mode || 0,
            index : this.index || 0,
            layer : this.layer || 1,
            name : this.name || ''
        };
    }

    /***
     * The mode has several things attached to it, including updating the pane visibility.
     * The custom setter here performs several checks prior to setting the value:
     * - Is it an integer?
     * - Is the value greater than the actual mode count?
     * Once those checks ar done, it hides all the panes and then activates the selected.
     * Then is saves the information and updates select box value to match. The last
     * is done due to the method being able to be changed by the configuration method
     * when a button is dragged to another location.
     * After all that is completed, it sends the mode to the plugin to update the icon
     * and anything else you're doing there and then stores the value in Elgato's storage.
     */
    get mode() { return this[mode] || 0; }
    set mode(v) {
        v = parseInt(v, 10);
        if (this.modePanes.length - 1 < v) return;
        this.modePanes.forEach(pane => pane.classList.remove('active'));
        this.modePanes[v].classList.add('active');
        this[mode] = v;
        this.modeSelect.value = this.mode;
        this.sendValueToPlugin('mode', this.mode);
        this.sendSettings();
    }

    /***
     * The index attribute is a lot simplier than the mode as it's simply a shot
     * index that has a minimum value of 0. Once confirmed (which technically the
     * input field cannot drop below anyway), the input fields are all updated,
     * the value is sent to the plugin and the value is saved to Elgato.
     * Note: Apparently you're converting the attribute to an C++ int value or
     * something on the plugin side since the maximum value is 255.
     */
    get index() { return this[index] || 0; }
    set index(v) {
        this[index] = Math.min(Math.max(0, parseInt(v, 10)), 255);
        this.dom.index.forEach(indexDom => indexDom.value = this.index);
        this.sendValueToPlugin('index', this.index);
        this.sendSettings();
    }

    /***
     * The layer attribute is nearly identical to the shot index though the minimum
     * value is a 1 instead of a 0.
     */
    get layer() { return this[layer] || 1; }
    set layer(v) {
        this[layer] = Math.max(1, parseInt(v, 10));
        this.dom.layer.forEach(layerDom => layerDom.value = this.layer);
        this.sendValueToPlugin('layer', this.layer);
        this.sendSettings();
    }

    /***
     * The name attribute doesn't really have checks to it as it's simply a text
     * field (for now). If and when there will be an ability to have a select
     * box for this attribute, this will likely greatly change, likely to use
     * shot indexes or something but for now, it's pretty straight forward.
     */
    get name() { return this[name] || ''; }
    set name(v) {
        this[name] = v;
        this.dom.name.forEach(nameDom => nameDom.value = this.name);
        this.sendValueToPlugin('name', this.name);
        this.sendSettings();
    }
    
    /***
     * Once a shot loads and connects to the websocket server of Elgato, there
     * is a request done for capturing the settings of a given button instance.
     * Upon the settings being returned, this runs through all the properties
     * that were set and triggers updating all attributes in the plugin.
     */
    applyConfig(config) {
        Object.keys(config).forEach(key => this[key] = config[key]);
    }

    /***
     * Upon the button being selected, there is a need to have a websocket
     * connection made to the Elgato, this method is exposed on the main
     * page but sets the default attributes for the button as well as sets
     * up the websocket. Technically, there should be more events here like
     * disconnect and error handling but for now, it's fine to keep as is.
     * There are bigger things to do first, like different transition types
     * and shot name popups.
     * @param {number} port The port that the websocket server is running
     * @param {string} uuid The unique identifier of the button
     * @param {string} regEvent An event to run confirming connection
     * @param {jsonString} appData Information about the app and device(s)
     * @param {jsonString} info Information associate to the plugin
     */
    connect(port, uuid, regEvent, appData, info) {
        this.id = uuid;
        this.info = JSON.parse(info);

        // Note that there is a 300ms delay with Windows for "localhost"
        // so using the 127.0.0.1 is faster for all platforms
        this.websocket = new WebSocket(`ws://127.0.0.1:${port}`);
        this.websocket.addEventListener('open', () => {
            this.send({
                event : regEvent,
                uuid : this.id
            });
            this.getSettings();
        });
        this.websocket.addEventListener('message', m => this.receive(m));
    }

    /***
     * As we will be saving the settings to the Elgato app, we need to
     * perform both send and request setting commands, these are simply
     * helper methods to perform these functions. Nothing special here.
     */
    sendSettings() {
        this.send({
            event : 'setSettings',
            context : this.id,
            payload : this
        });
    }

    getSettings() {
        this.send({
            event : 'getSettings',
            context: this.id
        });
    }

    /***
     * We need to ensure several things prior to sending anything to the
     * websocket and subsequently the plugin. First, are we connected,
     * and second, what are we sending? There are several attributes that
     * unfortunately are not maintained in both the plugin and this web
     * interface as the same type. The plugin uses strings for many things
     * including the mode full names. If the property being sent is any of
     * these attributes, simply normalize them here to the plugin's
     * requirements. Interestingly, the layer and index (shotIndex during 
     * the return) are supplied back as integer values but they do not
     * accept integer values from the websocket request.
     */
    sendValueToPlugin(property, value) {
        if (!this.websocket) return;
        if (property === 'mode') value = this.modePanes[this.mode].dataset.mode;
        if (['layer', 'index'].includes(property)) value = value.toString();
        this.send({
            action : this.info.action,
            event : 'sendToPlugin',
            context : this.id,
            payload : {
                [property] : value
            }
        });
    }

    /***
     * Since we are sending to the websocket and it requires some checks
     * as well as conversion to a JSON string, it's just easier to make
     * a method to handle that submission process.
     */
    send(obj) {
        if (!!this.websocket) this.websocket.send(JSON.stringify(obj));
    }

    /***
     * All messages coming from the Elgato websocket are handled here.
     * More specifically, the 2 types of current messages.
     */
    receive(message) {
        let data = JSON.parse(message.data);
        if (!data.event) return;
        switch (data.event) {
            case 'sendToPropertyInspector':
                this.receivePropInspector(data.payload);
                break;
            case 'didReceiveSettings':
                this.applyConfig(data.payload.settings);
                // We don't want to show the inspector panel form elements
                // until we have received and setup the properties.
                this.modeSelector.classList.add('active');
                break;
        }
    }

    /***
     * Upon receiving information from the plugin, we perform some checks
     * on it to validate and see if it is correct. If it isn't we correct
     * it by sending only that attribute back to it.
     * If the mode is 'automatic', we simply take the index and layer
     * attributes and update those locally as those values come directly
     * from the plugin.
     * Strangely, you have the "index" coming back as "shotIndex" for things
     * and the numeral values as actual numbers. It would be worth looking
     * into normalizing all of the attributes to the same type, of which
     * being integers when possible like the mode.
     */
    receivePropInspector(payload) {
        switch (payload.mode) {
            case 'automatic':
                if (payload.shotIndex !== this.index) {
                    this.index = payload.shotIndex;
                } else if (payload.layer !== this.layer) {
                    this.layer = payload.layer;
                }
                document.getElementById('msg_txt').textContent = `Will select master layer ${payload.layer} and shot index ${payload.shotIndex}.`;
                break;
            case 'layerAndIndex':
                if (payload.shotIndex !== this.index) {
                    this.sendValueToPlugin('index', this.index);
                } else if (payload.layer !== this.layer) {
                    this.sendValueToPlugin('layer', this.layer);
                }
                break;
            case 'name':
                if (payload.name !== this.name) this.sendValueToPlugin('name', this.name);
                break;
        }
    }

}