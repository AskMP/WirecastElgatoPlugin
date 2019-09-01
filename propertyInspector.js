var websocket = null,
uuid = null,
context = null,
actionInfo = {};

function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
    uuid = inUUID;
    // please note: the incoming arguments are of type STRING, so
    // in case of the inActionInfo, we must parse it into JSON first
    actionInfo = JSON.parse(inActionInfo); // cache the info
    context = actionInfo.context; //context of this shot instance
    localStorage.uuid = 1;
    
    websocket = new WebSocket('ws://localhost:' + inPort);
    // if connection was established, the websocket sends
    // an 'onopen' event, where we need to register our PI
    websocket.onopen = function () {
        var json = {
        event:  inRegisterEvent,
        uuid:   inUUID
        };
        // register property inspector to Stream Deck
        websocket.send(JSON.stringify(json));
    }
    
    websocket.onmessage = function (evt) {
        var jsonObj = JSON.parse(evt.data);
        console.log(jsonObj);
        var event = jsonObj['event'];
        if (event == "sendToPropertyInspector"){
            //check mode
            var mode = jsonObj.payload.mode;
            if (mode == "name"){
                var name = jsonObj.payload.name;
                setName(name);
            }
            else if (mode == "layerAndIndex"){
                var layer = jsonObj.payload.layer;
                var shotIndex = jsonObj.payload.shotIndex;
                setValues(layer, shotIndex);
            }
            else if (mode == "automatic"){
                var layer = jsonObj.payload.layer;
                var shotIndex = jsonObj.payload.shotIndex;
                setInfoText(layer, shotIndex);
            }
            setMode(mode);
        }
    }
}

// our method to pass values to the plugin
function sendValueToPlugin(value, param) {
    if (websocket) {
        const json = {
            "action": actionInfo['action'],
            "event": "sendToPlugin",
            "context": uuid,
            "payload": {
                [param] : value
            }
        };
        websocket.send(JSON.stringify(json));
    }
}

function sendNameToPlugin(){
    var name = document.getElementById("shot-name").value;
    sendValueToPlugin(name, "name");
}

function setName(name){
    document.getElementById("shot-name").value = name;
}

function setValues(layer, index){
    document.getElementById("layer").value = layer;
    document.getElementById("index").value = index;
}

function setInfoText(layer, index){
    var infoText = "Will select master layer "+layer+" and shot index "+index+".";
    document.getElementById("msg_txt").innerHTML = infoText;
}

function setMode(mode){
    
    switch (mode){
        case "name":
            layerElement.style.display = "none";
            indexElement.style.display = "none";
            messageElement.style.display = "none";
            textElement.style.display = "block";
            break;
        case "layerAndIndex":
            textElement.style.display = "none";
            messageElement.style.display = "none";
            layerElement.style.display = "block";
            indexElement.style.display = "block";
            break;
        case "automatic":
            textElement.style.display = "none";
            layerElement.style.display = "none";
            indexElement.style.display = "none";
            messageElement.style.display = "block";
            break;
    }
    document.getElementById("mode").value = mode;
}
