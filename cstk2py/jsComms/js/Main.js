//global variables
var _ws;
var _servletPath;

var _updateValue = "updateValue";
var _updateExecutionStatus = "updateExecutionStatus";
var _updateImageSwitcher = "updateImageSwitcher";
var _updateVerificationStatus = "updateVerificationStatus";
var _valueChanged = "valueChanged";
var _getPlotImage = "getPlotImage";
var _plotValueChanged = "plotValueChanged";
var _plotValueAdded = "plotValueAdded";
var _createPlot = "createPlot";
var _elementActivated = "elementActivated";
var _annotationsUpdated = "annotationsUpdated";
var _verificationStatusChanged = "verificationStatusChanged";
var _executionStatusChanged = "executionStatusChanged";
var _reloadPage = "reloadPage";
var _replacePage = "replacePage";
var _assignPage = "assignPage";
var _setValue = "setValue";
var _sendSignal = "sendSignal";
var _event = "event";
var _feature = "feature";
var _signal = "signal";
var _value = "value";
var _values = "values";

var _plotSet = new Set();
var _plotUpdater = null;
var _plotUpdaterInterval = 200;

var _default_opacity = 0.3;

var _refreshRate = 100;

//simulation data structure.
//{'type' : '[signal, value]', 'value' : 'string'};

$(document).ready(function() {
	//Fix SIM-7397
	$.ajaxSetup({ cache: false });
	connectToSimulationWebSocket();
	dispatchContentEditableOnChange();
	lostFocusWhenEnterPressed();
	loadInlineSVG();
});

function connectToSimulationWebSocket() {
	if ('WebSocket' in window) {
		// alert('WebSocket is supported. You can proceed with your code');
	} else {
		// alert('WebSockets are not supported. Try a fallback method like long-polling etc');
		alert('WebSockets are not supported.');
	}
	// simulation web server is started.
	// ip address should be generated and replaced every time
	var wsPath = "simulationWS";
	_servletPath = "/" + wsPath;
	
//	_ws = new WebSocket("ws://@IP_ADDRESS@:@PORT@/" + wsPath);
	$.ajax({ type: "GET", url: _servletPath, data: { method : "getIPAddress", address : "ws://@IP_ADDRESS@:@PORT@/" }
		, success: function (data, status) {
			if (data !== undefined && data !== "") {
				_ws = new WebSocket(data + wsPath);
			}	
		}, cache: false, async: false }
	);

	_ws.onopen = function() {
		registerExecutionStatus();
		registerNestedPaths();
		registerImageSwitcher();
		registerPlot();
	};
	
	_ws.onerror = function(error) {
		//alert(error);
		console.log(error);
	};
	
	_ws.onmessage = function(event) {
		processServerResponse(event);
	};
	
	_ws.onclose = function() {
		//alert('web socket connection is closed.');
		console.log('web socket connection is closed.');
		disableSimulationControlPanelButtons();
	};
}

function processServerResponse(event) {
	var type = getType(event);
	if (type == 'object' && event.data !== undefined) {
		try {
			var jsonData = JSON.parse(event.data);
			var method = jsonData.method;
			if (method == _valueChanged) {
				var paths = jsonData.paths;
				var val = jsonData.value;
				var formattedValue = jsonData.formattedValue;
				if (isString(paths) && val !== undefined) {
					$("[runtime=true]").each(function(index, item) {
						if ($(this).attr('paths') === paths) {
							setHTMLValue(item, val, formattedValue);
						}
					});
				}
			} else if (method == _getPlotImage) {
				var divID = jsonData.divID;
				if (divID !== undefined) {
					sendPlotImage(divID)
				}
			} else if (method == _plotValueAdded) {
			addTraces(jsonData);
			} else if (method == _plotValueChanged) {
				var divID = jsonData.divID;
				var traces = jsonData.traces;
				var values = jsonData.values;
				var x = jsonData.x;
				var xUpper = jsonData.xUpperBound;
				var xLower = jsonData.xLowerBound;
				var yUpper = jsonData.yUpperBound;
				var yLower = jsonData.yLowerBound;
				if (divID !== undefined && traces !== undefined && values !== undefined && x !== undefined) {
					plotChart(divID, traces, values, x, xUpper, xLower, yUpper, yLower);
				}
			} else if (method == _createPlot) {
			if (jsonData.divID !== undefined && jsonData.traces !== undefined && jsonData.title !== undefined && jsonData.xLabel !== undefined && jsonData.yLabel !== undefined) {
				createPlot(jsonData);
				}
			} else if (method == _elementActivated) {
				var id = jsonData.id;
				var paths = jsonData.paths;
				var represents = jsonData.represents;
				var parentRepresents = jsonData.parentRepresents;
				if (represents !== undefined) {
					switchImage(id, paths, represents, parentRepresents);
				}
			} else if (method == _annotationsUpdated) {
				updateAnnotations(jsonData.removedAnnotations, jsonData.addedAnnotations);
			} else if (method == _verificationStatusChanged) {
				var paths = jsonData.paths;
				var foregroundColor = jsonData.foregroundColor;
				var backgroundColor = jsonData.backgroundColor;
				var tooltipText = jsonData.tooltipText;
				if (paths !== undefined) {
					changeComponentProperties(paths, foregroundColor, backgroundColor, tooltipText);
				}
			} else if (method == _executionStatusChanged) {
				var executionStatus = jsonData.executionStatus;
				if (executionStatus !== undefined) {
					doUpdateExecutionStatus(executionStatus)
				}
			} else if (method == _updateExecutionStatus) {
				updateExecutionStatus();
			} else if (method == _updateValue) {
				var pathType = jsonData.pathType;
				var paths = jsonData.paths;
				var value = jsonData.value;
				var formattedValue = jsonData.formattedValue;
				if (pathType !== undefined && paths !== undefined && value !== undefined) {
					updateValue(pathType, paths, value, formattedValue);
				}
			} else if (method == _updateImageSwitcher) {
				var id = jsonData.id;
				var paths = jsonData.paths;
				var represents = jsonData.represents;
				var parentRepresents = jsonData.parentRepresents;
				if (id !== undefined && represents !== undefined) {
					updateImageSwitcher(id, paths, represents, parentRepresents);
				}
			} else if (method == _updateVerificationStatus) {
				var pathType = jsonData.pathType;
				var paths = jsonData.paths;
				var componentType = jsonData.componentType;
				if (pathType !== undefined && paths !== undefined && componentType !== undefined) {
					updateVerificationStatus(pathType, paths, componentType, event.data);
				}
			} else if (method == _reloadPage) {
				location.reload();
			} else if (method == _replacePage) {
				var url = jsonData.url;
				if (url !== undefined) {
					location.replace(url);
				}
			} else if (method == _assignPage) {
				var url = jsonData.url;
				if (url !== undefined) {
					location.assign(url);
				}
			}
		} catch (err) {
			//alert("Process Server Response:" + err.message);
			console.log("Process Server Response:" + err.message);
			console.log("Process Server Response:" + err.stack);
		}
	}
}

function runConfig(configID) {
	var json = {
		"method" : "runConfig",
		"configID" : configID
	};
	sendMessage(JSON.stringify(json));
}

function toProject(projectName) {
	var json = {
		"method" : "toProject",
		"projectName" : projectName
	};
	sendMessage(JSON.stringify(json));
}

function createJSON(name, value) {
	if (isArray(name) && isArray(value) && name.length == value.length) {
		var text = '{';
		for (i = 0; i < name.length; i++) {
			text += '"' + name[i] + '" : "' + value + '"';
			if (i != name.length) {
				text += ', ';
			}
		}
		text += '}';
	} else {
		return '{"' + name + '" : "' + value + '"}';
	}
}

function setValue(component) {
	var represents = findRepresents(component);
	var parentRepresents = findParentRepresents(component);
	if (getHTMLType(component) == "textfield" || getHTMLType(component) == "range" || getHTMLType(component) == "radio" || getHTMLType(component) == "select") {
		doSetValue($(component).attr('pathType'), $(component).attr('paths'), represents, parentRepresents, $(component).val());
	} else if (getHTMLType(component) == "checkbox") {
		doSetValue($(component).attr('pathType'), $(component).attr('paths'), represents, parentRepresents, $(component).prop('checked'))
	} else if (getHTMLType(component) == "td") {
		doSetValue($(component).attr('pathType'), $(component).attr('paths'), represents, parentRepresents, $(component).html())
	}
}

function doSetValue(pathType, paths, represents, parentRepresents, value) {
	$.get(_servletPath, { method : "setValue", pathType : pathType, paths : paths, represents : represents, parentRepresents : parentRepresents, value : value });
}

function wrap(component, formattedValue) {
	if (formattedValue !== undefined) {
		//get actual value
		var actualValue = getComponentValue(component);
		if (actualValue != null) {
			//backup
			$(component).attr("actualValue", actualValue);
			$(component).attr("formattedValue", formattedValue);
			
//			var prevTD = $(component).closest('td').prev('td');
//			console.log($(prevTD).text() + ", focus=" + $(component).is(":focus") + ", actualValue=" + $(component).attr("actualValue") + ", formattedValue=" + $(component).attr("formattedValue"));
			
			var newValue = formattedValue;
			if (getHTMLType(component) == "textfield") {
				$(component).val(newValue);
			} else if (getHTMLType(component) == "td" || getHTMLType(component) == "label") {
				$(component).html(newValue);
			}
		}
	}
}

function componentFocusLost(component) {
	if (getHTMLType(component) == "textfield") {
		if ($(component).val() != component.editing_text) {
			setValue(component);
		}
		delete component.editing_text;
	}
}

function componentFocusGained(component) {
	if (getHTMLType(component) == "textfield") {
		component.editing_text = $(component).val();
	}
}


function getComponentValue(component) {
	if (getHTMLType(component) == "textfield") {
		return $(component).val();
	} else if (getHTMLType(component) == "td" || getHTMLType(component) == "label") {
		return $(component).html();
	}
	return null;
}

function sendSignal(component, signal, signalID) {
	sendSignal(component, signal, signalID, null);
}

function sendSignal(component, signal, signalID, values) {
	var json = {
		"values" : values
	}
	$.get(_servletPath, { method : "sendSignal", pathType : $(component).attr('pathType'), paths : $(component).attr('paths'), represents : findRepresents($(component)), parentRepresents : findParentRepresents($(component)), signal : signal, signalID : signalID, values : JSON.stringify(json)} );
}

function findRepresents(component) {
	return $(component).closest("*[represents]").attr("represents");
}

function findParentRepresents(component) {
	return $(component).parent().closest("*[represents]").attr("represents");
}

//register both nested names and IDs
function registerNestedPaths() {
	registerNestedNames();
}

function registerNestedNames() {
	$("[runtime=true][pathType=name]").each(function(index, item) {
		doRegisterNestedNames($(this));
	});
}

function registerNestedName(component) {
	doRegisterNestedNames(component);
}

//registers nested names via ws.
function doRegisterNestedNames(component) {
	var paths = $(component).attr('paths');
	var componentType = getHTMLType(component);
	var represents = findRepresents(component);
	var parentRepresents = findParentRepresents(component);
	var json = {
			"method" : "registerPaths",
			"pathType" : "name",
			"paths" : paths,
			"represents" : represents,
			"parentRepresents" : parentRepresents,
			"componentType" : componentType
	};
	sendMessage(JSON.stringify(json));
}

function registerPlot() {
	$("div[id][configID]").each(function(index, item) {
		doRegisterPlot($(this));
	});
}

//registers plot via ws.
function doRegisterPlot(component) {
	var divID = $(component).attr('id');
	var paths = $(component).attr('paths');
	var configID = $(component).attr('configID');
	var represents = findRepresents($(component));
	var parentRepresents = findParentRepresents($(component));
	var json = {
		"method" : "registerPlot",
		"divID" : divID,
		"paths" : paths,
		"represents" : represents,
		"parentRepresents" : parentRepresents,
		"configID" : configID
	};
	sendMessage(JSON.stringify(json));
}

function createPlot(jsonData) {
	var divID = jsonData.divID;
	var traces = jsonData.traces;
	var title = jsonData.title;
	var xLabel = jsonData.xLabel;
	var yLabel = jsonData.yLabel;
	var xUpper = jsonData.xUpperBound;
	var xLower = jsonData.xLowerBound;
	var yUpper = jsonData.yUpperBound;
	var yLower = jsonData.yLowerBound;
	var values = jsonData.values;
	var x = jsonData.x;
	var colors = jsonData.colors;
	var linearInterpolation = jsonData.linearInterpolation;
	var loadedTimeSeries = jsonData.loadedTimeSeries;
	
	var data = [];
	for (var i = 0; i < traces.length; i++) {
		var color = '';
		if (colors.length > i) {
			color = colors[i];
		}
		data[i] = { x: x.slice(), y: values[i], name: traces[i], mode: 'lines', line: {color: color}, loaded: false };
		if (data[i].y == null) {
			data[i].y = [];
		}
		if (linearInterpolation !== undefined && !linearInterpolation) {
			data[i].line.shape = 'hv';
		}
	}
	
	if (loadedTimeSeries !== undefined) {
		for (var j = 0; j < loadedTimeSeries.length; j++) {
			var loaded = loadedTimeSeries[j];
			for (var k = 0; k < loaded.loadedTraces.length; k++) {
				var index = data.length;
				data[index] = {
						x: loaded.loadedX.slice(),
						y: loaded.loadedValues[k],
						name: loaded.loadedTraces[k],
						mode: 'lines',
						line: {
							dash: 'dot'
						},
						loaded: true
				};
				if (linearInterpolation !== undefined && !linearInterpolation) {
					data[index].line.shape = 'hv';
				}
			}
		}
	}
	
	var xRange = [];
	if (xUpper !== undefined && xLower !== undefined) {
		xRange = [xLower, xUpper];
	}
	var yRange = [];
	if (yUpper !== undefined && yLower !== undefined) {
		yRange = [yLower, yUpper];
	}
	
	var layout = {
			title: title,
			xaxis: {
				title: xLabel,
				range : xRange,
				hoverformat: '.4f'
			},
			yaxis: {
				title: yLabel,
				range : yRange,
				hoverformat: '.4f'
			},
			legend: {
			    x: 0.5,
			    y: -0.2,
			    orientation: "h",
			    xanchor: "center"
			},
			margin: {
				t: 30,
				b: 0
			},
			showlegend: true
	};
	
	Plotly.newPlot(divID, data, layout, {responsive: true});
	
	registerPlotUpdater();
	
	//Fix SIM-6955
	if ($("div[id][configID]").length == 1) {
		repositionSimulationControlPanel();
	}
}

function registerPlotUpdater() {
	if (_plotUpdater == null) {
		_plotUpdater = setInterval(function() {
			_plotSet.forEach(function(value) {
				Plotly.redraw(value);
			});
			_plotSet.clear();
		}, _plotUpdaterInterval);
	}
}

function updateChartLater(divID) {
	_plotSet.add(divID);
}

function plotChart(divID, traces, values, x, xUpper, xLower, yUpper, yLower) {
	var chart = document.getElementById(divID);
	
	if (xUpper !== undefined && xLower !== undefined) {
		chart.layout.xaxis.range = [xLower, xUpper];
	}
	if (yUpper !== undefined && yLower !== undefined) {
		chart.layout.yaxis.range = [yLower, yUpper];
	}
	
	var dataArray = chart.data;
	var length = dataArray.length;
	for (var i = 0; i < length; i++) {
		for (var j = 0; j < traces.length; j++) {
			if (traces[j] === dataArray[i].name && !dataArray[i].loaded) {
				dataArray[i].x.push(x);
				dataArray[i].y.push(values[j]);
				break;
			}
		}
	}

	updateChartLater(divID);
}

/*function isLegendOverlapXTitle(divID) {
	var legend = $("div[id=" + divID + "] .legend")[0];
	var xtitle = $("div[id=" + divID + "] .g-xtitle")[0];
	if (legend !== undefined && xtitle !== undefined) {
		var legendRect = legend.getBoundingClientRect();
		var xtitleRect = xtitle.getBoundingClientRect();
		return !(legendRect.bottom < xtitleRect.top || legendRect.top > xtitleRect.bottom);
	}
	return false;
}

function fixLegendOverlapXTitle(divID) {
	var legend = $("div[id=" + divID + "] .legend")[0];
	var xtitle = $("div[id=" + divID + "] .g-xtitle")[0];
	if (legend !== undefined && xtitle !== undefined) {
		var legendTran = legend.getAttribute("transform");
		console.log(legendTran);
		var xtitleTran = xtitle.getAttribute("transform");
		console.log(xtitleTran);
		legend.setAttribute("transform", legendTran + " translate(0, 10)");
		xtitle.setAttribute("transform", "translate(0, -20)");
	}
}*/

function addTraces(divID, traces, title, yLabel, colors, values, x) {
	var divID = jsonData.divID;
	var traces = jsonData.traces;
	var title = jsonData.title;
	var yLabel = jsonData.yLabel;
	var colors = jsonData.colors;
	var values = jsonData.values;
	var x = jsonData.x;
	var linearInterpolation = jsonData.linearInterpolation;
	
	var chart = document.getElementById(divID);
	chart.layout.title = title;
	chart.layout.yaxis.title = yLabel;
	
	var newData= [];
	for (var i = 0; i < traces.length; i++) {
		var color = '';
		if (colors.length > i) {
			color = colors[i];
		}
		newData[i] = { x: [x], y: [values[i]], name: traces[i], mode: 'lines', line: {color: color} };
		if (linearInterpolation !== undefined && !linearInterpolation) {
			newData[i].line.shape = 'hv';
		}
	}
	
	Plotly.addTraces(divID, newData);
	
	updateChartLater(divID);
}

function sendPlotImage(divID) {
	var chart = document.getElementById(divID);
	Plotly.toImage(chart)
	.then(function(png){
		var json = {
			"method" : "setPlotImage",
			"divID" : divID,
			"image" : png
		};
		sendMessage(JSON.stringify(json));
	});
}

function registerImageSwitcher() {
	$("img[runtime=true][id]").each(function(index, item) {
		doRegisterImageSwitcher($(this).attr('id'), $(this).parent());
	});
}

//registers image switcher via ws.
function doRegisterImageSwitcher(id, parentDiv) {
	var paths = null;
	var represents = null;
	var parentRepresents = null;
	var allowEmptyImage = null;
	if ("div" == getHTMLType(parentDiv)) {
		paths = $(parentDiv).attr('paths');
		represents = findRepresents($(parentDiv));
		parentRepresents = findParentRepresents($(parentDiv));
		allowEmptyImage = $(parentDiv).attr('allowEmptyImage');
	}
	var json = {
		"method" : "registerImageSwitcher",
		"id" : id,
		"paths" : paths,
		"represents" : represents,
		"parentRepresents" : parentRepresents,
		"allowEmptyImage" : allowEmptyImage
	};
	sendMessage(JSON.stringify(json));
}

function registerExecutionStatus() {
	$("body[isLinkPage!=true]").each(function(index, item) {
		$.get(_servletPath, { method : "getSimulationControlPanel" }, function(data, status) {
			if (data !== undefined && data !== "") {
				var body = $("body");
				body.append(data);
				
				var controlPanel = $("div#SimulationControlPanel");
				controlPanel.css("position", "absolute");
				controlPanel.css("left", "10px");
				
				repositionSimulationControlPanel();
				
				var json = {
					"method" : "registerExecutionStatus"
				};
				sendMessage(JSON.stringify(json));
			}
		});
	});
	
	$("div#ProjectLinks").each(function(index, item) {
		var div = $(this);
		$.get(_servletPath, { method : "getProjectLinks" }, function(data, status) {
			if (data !== undefined && data !== "") {
				var jsonData = JSON.parse(data);
				div.append(jsonData.links);
			}
		});
	});
	
	$("div#ConfigLinks").each(function(index, item) {
		var div = $(this);
		$.get(_servletPath, { method : "getConfigLinks" }, function(data, status) {
			if (data !== undefined && data !== "") {
				var jsonData = JSON.parse(data);
				div.append(jsonData.links);
				var title = $("title");
				title.append(jsonData.title);
			}
		});
	});
}

function repositionSimulationControlPanel() {
	var body = $("body");
	var maxHeight = (getMaxHeight(body) + 20) + "px";
	var controlPanel = $("div#SimulationControlPanel");
	controlPanel.css("top", maxHeight);
}

//elementID is nullable
//paths is nullable
//parentRepresents is nullable
function switchImage(elementID, paths, represents, parentRepresents) {
	if (elementID !== undefined) {
		if (parentRepresents !== undefined) {
			if (paths !== undefined) {
				var imgElement = $('*[represents="' + parentRepresents + '"]').find('div[represents="' + represents + '"][paths="' + paths + '"] img#' + elementID);
				imgElement.show();
				imgElement.siblings("img").hide();
			} else {
				var imgElement = $('*[represents="' + parentRepresents + '"]').find('div[represents="' + represents + '"] img#' + elementID);
				imgElement.show();
				imgElement.siblings("img").hide();
			}
		} else {
			if (paths !== undefined) {
				var imgElement = $('div[represents="' + represents + '"][paths="' + paths + '"] img#' + elementID);
				imgElement.show();
				imgElement.siblings("img").hide();
			} else {
				var imgElement = $('div[represents="' + represents + '"] img#' + elementID);
				imgElement.show();
				imgElement.siblings("img").hide();
			}
		}
	} else {
		if (parentRepresents !== undefined) {
			if (paths !== undefined) {
				var divElement = $('*[represents="' + parentRepresents + '"]').find('div[represents="' + represents + '"][paths="' + paths + '"][allowEmptyImage]');
				var imgElement = $(divElement).children('img#' + elementID);
				if (imgElement.length == 0) {
					$(divElement).children("img").hide();
				} else {
					imgElement.show();
					imgElement.siblings("img").hide();
				}
			} else {
				var divElement = $('*[represents="' + parentRepresents + '"]').find('div[represents="' + represents + '"][allowEmptyImage]');
				var imgElement = $(divElement).children('img#' + elementID);
				if (imgElement.length == 0) {
					$(divElement).children("img").hide();
				} else {
					imgElement.show();
					imgElement.siblings("img").hide();
				}
			}
		} else {
			if (paths !== undefined) {
				var divElement = $('div[represents="' + represents + '"][paths="' + paths + '"][allowEmptyImage]');
				var imgElement = $(divElement).children('img#' + elementID);
				if (imgElement.length == 0) {
					$(divElement).children("img").hide();
				} else {
					imgElement.show();
					imgElement.siblings("img").hide();
				}
			} else {
				var divElement = $('div[represents="' + represents + '"][allowEmptyImage]');
				var imgElement = $(divElement).children('img#' + elementID);
				if (imgElement.length == 0) {
					$(divElement).children("img").hide();
				} else {
					imgElement.show();
					imgElement.siblings("img").hide();
				}
			}
		}
	}
}

function updateAnnotations(removedAnnotations, addedAnnotations) {
	if (removedAnnotations !== undefined) {
		for (var i = 0; i < removedAnnotations.length; i++) {
			var annotationID = removedAnnotations[i].annotationID;
			
			var gElement = $('g#' + annotationID);
			gElement.css("stroke-width", "0");
			gElement.css("stroke", "");
			
			gElement.removeAttr("annotationText");
		}
	}
	
	if (addedAnnotations !== undefined) {
		for (var i = 0; i < addedAnnotations.length; i++) {
			var annotationID = addedAnnotations[i].annotationID;
			var annotationText = addedAnnotations[i].annotationText;
			var annotationColor = addedAnnotations[i].annotationColor;
			
			var gElement = $('g#' + annotationID);
			gElement.css("stroke-width", "2");
			gElement.css("stroke", annotationColor);
			
			gElement.attr("annotationText", annotationText);
		}
	}
}

function changeComponentProperties(paths, foregroundColor, backgroundColor, tooltipText) {
	if (tooltipText === undefined) {
		tooltipText = "";
	}
	var components = $('[runtime=true][pathType="name"][paths="' + paths + '"]');
	components.each(function(index, item) {
		if ("label" == getHTMLType($(this))) {
			var fgColor = foregroundColor === undefined ? "" : foregroundColor;
			var bgColor = backgroundColor === undefined ? "" : backgroundColor;
			$(this).parent().css('color', fgColor);
			$(this).parent().css('background-color', bgColor);
			if (tooltipText !== undefined) {
				$(this).attr('title', tooltipText);
			}
		} else if ("textfield" == getHTMLType($(this)) || "td" == getHTMLType($(this))) {
			var fgColor = foregroundColor === undefined ? "inherit" : foregroundColor;
			var bgColor = backgroundColor === undefined ? ($(this).attr("defaultBG") !== undefined ? $(this).attr("defaultBG") : "inherit") : backgroundColor;
			$(this).css('color', fgColor);
			$(this).css('background-color', bgColor);
			if (tooltipText !== undefined) {
				$(this).attr('title', tooltipText);
			}
		}
	});
}

function sendMessage(message) {
	//alert(message);
	_ws.send(message);
}

function updateValue(pathType, paths, value, formattedValue) {
	$("[runtime=true][pathType=\"" + pathType + "\"][paths=\"" + paths + "\"]").each(function(index, item) {
		setHTMLValue($(this), value, formattedValue);
	});
}

function updateVerificationStatus(pathType, paths, componentType, data) {
	if (componentType == "label") {
		$("label[runtime=true][pathType=\"" + pathType + "\"][paths=\"" + paths + "\"]").each(function(index, item) {
			initComponentProperties($(this).parent(), data);
		});
	} else if (componentType == "textfield") {
		$("input[type=textfield][runtime=true][pathType=\"" + pathType + "\"][paths=\"" + paths + "\"]").each(function(index, item) {
			initComponentProperties($(this), data);
		});
	} else if (componentType == "td") {
		$("td[runtime=true][pathType=\"" + pathType + "\"][paths=\"" + paths + "\"]").each(function(index, item) {
			initComponentProperties($(this), data);
		});
	}
}

function updateExecutionStatus() {
	$("div#SimulationControlPanel").each(function(index, item) {
		$.get(_servletPath, { method : "getExecutionStatus" }, function(data, status) {
			doUpdateExecutionStatus(data);
		});
		
		$(this).draggable();
		$(this).draggable("disable");
		$(this).css('z-index', 1);
	});
}

function doUpdateExecutionStatus(statusAsText) {
	var jsonData = JSON.parse(statusAsText);
	updateStartButtonsGroup(jsonData);
	updateStepIntoButton(jsonData);
	updateStepOverButton(jsonData);
}

function enableMove() {
	$("div#SimulationControlPanel input#MoveButton").each(function(index, item) {
		$(this).parent().draggable("enable");
		doEnableButton($(this));
		$(this).attr("onclick", "disableMove();");
		$(this).prop("title", "Disable Move");
	});
}

function disableMove() {
	$("div#SimulationControlPanel input#MoveButton").each(function(index, item) {
		$(this).parent().draggable("disable");
		doDisableButton($(this));
		$(this).attr("onclick", "enableMove();");
		$(this).prop("title", "Enable Move");
	});
}

function updateStartButtonsGroup(status) {
	if (status.restart !== undefined) {
		var button = getRestartButton();
		button.show();
		button.prop('title', status.restart);
		button.siblings("input").hide();
		
		disableButton(getStepIntoButton());
		disableButton(getStepOverButton());
		disableButton(getTerminateButton());
	} else if (status.ready && /*SIM-7431*/ !status.paused && !status.started) {
		var button = getStartButton();
		button.show();
		button.siblings("input").hide();
		if (status.readyEnabled) {
			enableButton(button);
		} else {
			disableButton(button);
		}
	} else if (status.paused) {
		var button = getResumeButton();
		button.show();
		button.siblings("input").hide();
		//Fix SIM-7202
		if (status.readyEnabled) {
			enableButton(button);
		} else {
			disableButton(button);
		}
	} else if (status.started) {
		var button = getPauseButton();
		button.show();
		button.siblings("input").hide();
		//Fix SIM-7243		
		if (status.readyEnabled) {		
			enableButton(button);		
		} else {		
			disableButton(button);		
		}
	}
}

function updateStepIntoButton(status) {
	var button = getStepIntoButton();
	if (status.stepIntoEnabled) {
		enableButton(button);
	} else {
		disableButton(button);
	}
}

function updateStepOverButton(status) {
	var button = getStepOverButton();
	if (status.stepOverEnabled) {
		enableButton(button);
	} else {
		disableButton(button);
	}
}

function disableButton(button) {
	button.prop('disabled', true);
		doDisableButton(button);
	}

function doDisableButton(button) {
	button.fadeTo(500, _default_opacity);
}

function enableButton(button) {
	button.prop('disabled', false);
		doEnableButton(button)
	}

function doEnableButton(button) {
	button.fadeTo(500, 1);
}

function disableSimulationControlPanelButtons() {
	$("div#SimulationControlPanel").each(function(index, item) {
		var startButton = getStartButton();
		startButton.show();
		startButton.siblings("input").hide();
		disableSimulationControlPanelButton(startButton);
		
		disableSimulationControlPanelButton(getStepIntoButton());
		disableSimulationControlPanelButton(getStepOverButton());
		disableSimulationControlPanelButton(getTerminateButton());
	});
}

function disableSimulationControlPanelButton(button) {
	disableButton(button);
	button.prop('title', 'Simulation web server has been terminated');
}

function initComponentProperties(component, data) {
	if (data !== undefined && data.trim().length > 0) {
		var jsonData = JSON.parse(data);
		var foregroundColor = jsonData.foregroundColor;
		var backgroundColor = jsonData.backgroundColor;
		var tooltipText = jsonData.tooltipText;
		if (foregroundColor !== undefined && backgroundColor !== undefined) {
			$(component).css('color', foregroundColor);
			$(component).css('background-color', backgroundColor);
			if (tooltipText !== undefined) {
				$(component).attr('title', tooltipText);
			}
		}
	}
}

function updateImageSwitcher(id, paths, represents, parentRepresents) {
	switchImage(id, paths, represents, parentRepresents);
}

function doStart() {
	$.get(_servletPath, { method : "start" });
}

function pause() {
	$.get(_servletPath, { method : "pause" });
}

function resume() {
	$.get(_servletPath, { method : "resume" });
}

function restart() {
	$.get(_servletPath, { method : "restart" });
}

function stepInto() {
	$.get(_servletPath, { method : "stepInto" });
}

function stepOver() {
	$.get(_servletPath, { method : "stepOver" });
}

function terminate() {
	$.get(_servletPath, { method : "terminate" });
}

function getStartButton() {
	return $("input#StartButton");
}

function getPauseButton() {
	return $("input#PauseButton");
}

function getResumeButton() {
	return $("input#ResumeButton");
}

function getRestartButton() {
	return $("input#RestartButton");
}

function getStepIntoButton() {
	return $("input#StepIntoButton");
}

function getStepOverButton() {
	return $("input#StepOverButton");
}

function getTerminateButton() {
	return $("input#TerminateButton");
}

//also generate div element with divID before calling this function.
function loadInnerPage(url, divID) {
	var draggableDiv = $("div#" + divID);
	//TODO Jan, generate id="body" to <body>
	draggableDiv.load(url, function(response, status, xhr) {
				var data = response.replace('<body', '<body><div id="body"').replace('</body>', '</div></body>');
				var body = $(data).filter('#body');
				draggableDiv.html($(body).children());
				
				var maxWidth = getMaxWidth(draggableDiv);
//				$(draggableDiv).css("max-width", maxWidth + 10);
				$(draggableDiv).css("width", maxWidth + 10);
				
				var maxHeight = getMaxHeight(draggableDiv);
//				$(draggableDiv).css("max-height", maxHeight + 10);
				$(draggableDiv).css("height", maxHeight + 10);
				
				//TODO Jan, recalculate bounds due to icon added.
				draggableDiv.prepend("<img class=\"move_button\" src=\"images/sim_move.png\" align=\"right\" />");
				
				$(draggableDiv).css("padding", "5px");
				$(draggableDiv).css("border", "1px solid #dddddd");
				//$(draggableDiv).css("color", "#333333");
			});
	draggableDiv.draggable({ handle: "img.move_button" });
}

function getMaxWidth(elem) {
	var maxWidth = Math.max.apply(null, $(elem).find("*").map(function() {
		return $(this).position().left + $(this).width();
	}).get());
	return maxWidth;
}

function getMaxHeight(elem) {
	var maxHeight = Math.max.apply(null, $(elem).find("*").map(function() {
		return $(this).position().top + $(this).height();
	}).get());
	return maxHeight;
}

function dispatchContentEditableOnChange() {
	var tags = document.querySelectorAll('[contenteditable=true][onchange]');
	for (var i = tags.length - 1; i >= 0; i--)
		if (typeof (tags[i].onblur) != 'function') {
			tags[i].onfocus = function() {
				this.data_orig = this.innerHTML;
			};
			tags[i].onblur = function() {
				//Fix SIM-6759
				$(this).html($(this).text().trim());
				
				if (this.innerHTML != this.data_orig) {
					this.onchange();
				}
				delete this.data_orig;
			};
		}
}

function lostFocusWhenEnterPressed() {
	$("td").keypress(function(evt) {
		if (evt.which == 13) {
			evt.preventDefault();
			$(this).blur();
		}
	});
	$("input[type=textfield]").keypress(function(evt) {
		if (evt.which == 13) {
			evt.preventDefault();
			$(this).blur();
		}
	});
}

function loadInlineSVG() {
	var svgDiv = $("div.svg");
	if (svgDiv.size() > 0) {
		svgDiv.each(function(index, item) {
			$(this).load($(this).attr('src'), function(response, status, xhr) {
				$(this).find('g.element').css("stroke-width", "0");
			});
		});
	}
}

function setHTMLValue(item, data, formattedValue) {
	if (getHTMLType(item) == "textfield") {
		if (!$(item).is(":focus")) {
			$(item).val(data);
			wrap(item, formattedValue);
		}
	} else if (getHTMLType(item) == "label") {
		$(item).html(String(data));
		wrap(item, formattedValue);
	} else if (getHTMLType(item) == "checkbox") {
		if (isEqual(String(data), "true")) {
			$(item).prop('checked', true);
		} else {
			$(item).prop('checked', false);
		}
	} else if (getHTMLType(item) == "td") {
		$(item).html(String(data));
		wrap(item, formattedValue);
	} else if (getHTMLType(item) == "range" || getHTMLType(item) == "select") {
		$(item).val(data);
	} else if (getHTMLType(item) == "radio") {
		if (isEqual(String(data), $(item).val())) {
			$(item).prop('checked', true);
		}
	}
}

function getHTMLType(component) {
	if ($(component).is("input")) {
		return $(component).attr('type');
	} else if ($(component).is("label")) {
		return "label";
	} else if ($(component).is("td")) {
		return "td";
	} else if ($(component).is("div")) {
		return "div";
	} else if ($(component).is("select")) {
		return "select";
	} else {
		return component.tagName;
	}
}

function isEqual(oldValue, newValue) {
	var equals = false;
	if (typeof oldValue === 'string') {
		oldValue = oldValue.trim();
	}
	if (typeof newValue === 'string') {
		newValue = newValue.trim();
	}
	if ((typeof oldValue === 'string' && oldValue.length == 0) || (typeof newValue === 'string' && newValue.length == 0)) {
		equals = oldValue === newValue;
	} else {
		equals = oldValue == newValue;
	}
	
	return equals;
}

function isArray(p) {
	return Array.isArray(p);
}

function isString(p) {
	return typeof p == 'string';
}

function getType(p) {
	if (Array.isArray(p))
		return 'array';
	else if (typeof p == 'string')
		return 'string';
	else if (p != null && typeof p == 'object')
		return 'object';
	else
		return 'other';
}
