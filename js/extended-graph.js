var extendedChart;
var extendedChartLegend;
var graphiteTargetOptions = {};

$(document).ready(function() {
	$('div.btn-group[data-toggle-name=is_private]').each(function() {
		var group = $(this);
		var form = group.parents('form').eq(0);
		var name = group.attr('data-toggle-name');
		var hidden = $('input[name="' + name + '"]', form);
		$('button', group).each(function() {
			var button = $(this);
			button.live('click', function() {
				hidden.val($(this).text());
				setExtendedChartRenderer($(this).text());
			});
			if (button.val() == hidden.val()) {
				button.addClass('active');
			}
		});
	});
});


Rickshaw.Fixtures.Number.formatBase1024KMGTPShort = function(y) {
	return formatBase1024KMGTPShort(y);
};

var palette = new Rickshaw.Color.Palette({
	scheme: 'colorwheel'
});

function getRickshawPaletteColor() {
	if ( palette.runningIndex == palette.scheme.length ) { palette.runningIndex = 0; }
	return palette.color();
}

function setRickshawPalette(toScheme) {
	palette.scheme = toScheme;
	palette.runningIndex=0;
}

function loadExtendedGraph(target, dashboardTitle, graphTitle) {
	$("#extendedGraphTitle").text(dashboardTitle + " - " + graphTitle);
	showExtendedGrapProgresshMessge("Accessing Graphite metrics API");
	$('#extendedChart').empty();
	$('#extendedLegend').empty();
	$('#timeline').empty();
	target = stripEventsFromTargets(target);
	loadGraphiteData(target, function(json) {
		showExtendedGrapProgresshMessge("Rendering metrics to graph");
		graphiteTargetOptions = parseGraphiteOptions(target);
		var data = transformGraphiteData(json);
		//console.profile("render extended graph");
		renderExtendedGraph(target, data);
		//console.profileEnd();
		showExtendedGrapProgresshMessge("");
	});
}

function stripEventsFromTargets(targets) {
	if ( targets.indexOf("events") == -1 ) {
		return "targets";
	};
	var target_arr = targets.split('&');
	var result_arr = new Array();
	for (var i = 0; i < target_arr.length; i++) {
		if ( target_arr[i].indexOf("events") == -1 ) { result_arr.push(target_arr[i]); };
	};
	var result = result_arr.join('&');
	return result;
}

function loadExtendedEvents(annotator) {
	showExtendedGrapProgresshMessge("Accessing events API");

	var timeBack = $('#timeBack').val();
	var start, end;
	if (timeBack != "") {
		var tsValue = parseMomentTimeSpanValue(timeBack);
		var tsFrame = parseMomentTimeSpanFrame(timeBack);
		end = moment();
		start = end.clone().subtract(tsFrame, tsValue);
	} else {
		start = moment($('#start').val());
		end = moment($('#end').val());
	}
	var eventsUrl = _.template(graphitusConfig.eventsUrl, {
		start: start.format("YYYY-MM-DD HH:mm:ss"),
		end: end.format("YYYY-MM-DD HH:mm:ss")
	});

	$.ajax({
		type: "get",
		url: eventsUrl,
		dataType: 'json',
		success: function(json) {
			showExtendedGrapProgresshMessge("Processing events");
			$.each(json, function(i, event) {
				var eventOffset = (calculateEventOffset() * 60);
				var displayZone = calculateEventOffset() * -1;
				var start = moment(event.start, graphitusConfig.eventsDateFormat);
				var end = moment(event.end, graphitusConfig.eventsDateFormat);
				var message = "<span label='timeline-label'>" + event.message + "</span>";
				var annotationContent = "[" + start.zone(displayZone).format("HH:mm") + ((end) ? "-" + end.zone(displayZone).format("HH:mm") : "") + "] - " + message;
				annotator.add(start.unix() + eventOffset, annotationContent, (end) ? end.unix() + eventOffset : null);
			});
			extendedChart.update();
			showExtendedGrapProgresshMessge("");
		},
		error: function(xhr, ajaxOptions, thrownError) {
			console.log(thrownError);
		}
	});
}

function calculateUtcOffset() {
	try {
		return moment().tz($('#tz').val()).zone();
	} catch (e) {
		console.log("Error parsing timezone " + $('#tz').val() + ", make sure timezone exists in moment-timezone-data.js.")
		return 0;
	}
}

function calculateEventOffset() {
	try {
		return (calculateUtcOffset() * -1) + (moment().tz(graphitusConfig.eventsTimezone).zone() - (moment().zone()));
	} catch (e) {
		console.log("Error parsing timezone " + graphitusConfig.eventsTimezone + ", make sure timezone exists in moment-timezone-data.js.")
		return 0;
	}
}

function parseGraphiteOptions(graphiteUrl) {
	var graphiteOptions = {};
	graphiteUrl.replace(/.*\?/,'').split("&").forEach(function(x){
		var keyValue = x.split("=");
		graphiteOptions[keyValue[0]] = keyValue[1];
	});
	return graphiteOptions;
}

function renderExtendedGraph(target, data) {
	// get presets from graphite parsed options
	var min = ( typeof graphiteTargetOptions['yMin'] === "undefined" || graphiteTargetOptions['yMin'] === "" ) ? 'auto' : graphiteTargetOptions['yMin'];
	var max = graphiteTargetOptions['yMax']; // leave it udefined if not in the graphiteUrl
	switch ( graphiteTargetOptions['areaMode'] ) {
		case 'stacked':
			var renderer = 'area';
			var stack = true;
			Rickshaw.Series.zeroFill(data);
			break;
		case 'all':
			var renderer = 'area';
			Rickshaw.Series.zeroFill(data);
			var stack = false;
			break;
		default:
			var renderer = 'line';
			var stack = false;
			break;
	}

	$('#' + renderer).click();
	extendedChart = new Rickshaw.Graph({
		element: document.getElementById("extendedChart"),
		width: $(window).width() - 370,
		height: $(window).height() - 250,
		renderer: renderer,
		stack: stack,
		stroke: true,
		min: min,
		max: max,
		interpolation: 'linear',
		series: data
	});

	extendedChart.render();

	var slider = new Rickshaw.Graph.RangeSlider({
		graph: extendedChart,
		element: $('#slider')
	});

	var hoverDetail = new Rickshaw.Graph.HoverDetail({
		graph: extendedChart,
		formatter: function(series, x, y, formattedX, formattedY, d) {
			var xOffset = moment().zone() * 60;
			var dotDate=moment(((x + xOffset) * 1000), "").format("YYYY-MM-DD HH:mm");
			return "<span style='line-height:18px;'><span class='y-hover-label-name'>" + dotDate + "</span> <br> <span class='y-hover-label-name'>" + series.name + "</span> - &nbsp;<span class='y-hover-label-value'>" + Rickshaw.Fixtures.Number.formatBase1024KMGTPShort(y) + "</span></span>";
		},
		xFormatter: function(x) {
			return ""
		}
	} );

	var annotator = new Rickshaw.Graph.Annotate( {
		graph: extendedChart,
		element: document.getElementById('timeline')
	});

	loadExtendedEvents(annotator);

	extendedChartLegend = new Rickshaw.Graph.Legend({
		graph: extendedChart,
		element: document.getElementById('extendedLegend'),
		naturalOrder: true
	});
	var shelving = new Rickshaw.Graph.Behavior.Series.Toggle({
		graph: extendedChart,
		legend: extendedChartLegend
	});
	var order = new Rickshaw.Graph.Behavior.Series.Order({
		graph: extendedChart,
		legend: extendedChartLegend
	});

	var highlighter = new Rickshaw.Graph.Behavior.Series.Highlight({
		graph: extendedChart,
		legend: extendedChartLegend
	});

	var smoother = new Rickshaw.Graph.Smoother({
		graph: extendedChart,
		element: $('#smoother')
	});

	var numDataPoints = data[0].data.length;
	var largeDataScaling = Math.round(numDataPoints / 10000);
	if (largeDataScaling > 1) {
		console.log("scaling rickshaw graph down by a smoothing factor of: " + largeDataScaling +
			"in order not to crash the browser because a large number of datapoints was: " + numDataPoints);

		showExtendedGrapProgresshWarning("whoa! lots of data points, smoothing factor: " + largeDataScaling);
		smoother.setScale(largeDataScaling);
	}

	var xAxis = new Rickshaw.Graph.Axis.Time({
		graph: extendedChart,
		ticksTreatment: 'glow'
	});

	var smoother = new Rickshaw.Graph.Smoother({
		graph: extendedChart,
		element: $('#smoother'),
	});

	xAxis.render();

	var yAxis = new Rickshaw.Graph.Axis.Y({
		graph: extendedChart,
		ticksTreatment: 'glow',
		tickFormat: Rickshaw.Fixtures.Number.formatBase1024KMGTPShort
	});

	yAxis.render();

	var controls = new RenderControls({
		element: document.querySelector('#extendedChartOptionsForm'),
		graph: extendedChart
	});

    var extendedLegendHeight = $(window).height() - 250;
    $('#extendedLegend').css({'min-height':extendedLegendHeight});
	$('#lightboxProgress').hide();
}

function transformGraphiteData(data) {
	resultData = _.map(data, function(item) {
		var color = getRickshawPaletteColor();
		var stroke = hex2rgb(color);

		if ( graphiteTargetOptions['areaAlpha'] ) {
			color = hex2rgb(color,graphiteTargetOptions['areaAlpha']);
		}

		return {
			"color": color,
			"stroke" : stroke,
			"name": item.target.replace(/_/g, ' '),
			"data": graphiteToRickshawModel(item.datapoints)
		};
	});
	return resultData;
}

function graphiteToRickshawModel(datapoints) {
	var lastX = 0;
	var ret = _.map(datapoints, function(point) {
		lastX = point[0] !== null ? point[0] : lastX
		return {
			'x': point[1] - calculateUtcOffset() * 60,
			'y': point[0]
		};
	});
	return ret;
}

function setExtendedChartRenderer(renderer) {
	extendedChart.renderer = renderer;
	extendedChart.configure(extendedChart);
	extendedChart.render();
}

function legendSelectAll() {
	for (var i = 0; i < extendedChartLegend.lines.length; i++) {
		var line = extendedChartLegend.lines[i];
		line.element.classList.remove('disabled');
		line.series.enable();
	}
}

function legendSelectNone() {
	for (var i = 1; i < extendedChartLegend.lines.length; i++) {
		var line = extendedChartLegend.lines[i];
		line.element.classList.add('disabled');
		line.series.disable();
	}
}

function showExtendedGrapProgresshMessge(msg) {
	$("#lightboxProgressText").text(msg);
	if (msg == "") {
		$("#lightboxProgress").hide();
	} else {
		$("#lightboxProgress").show();
	}
}

function showExtendedGrapProgresshWarning(msg) {
	$("#lightboxProgressWarningWarning").text(msg);
	$("#lightboxProgressWarningWarning").show();
}


function parseMomentTimeSpanValue(timeSpan) {
	return parseInt(timeSpan.substring(0, timeSpan.length - 1));
}

function parseMomentTimeSpanFrame(timeSpan) {
	var delimiterIdx = timeSpan.length - 1;
	if (timeSpan.lastIndexOf('w') == delimiterIdx) {
		return 'weeks';
	} else if (timeSpan.lastIndexOf('d') == delimiterIdx) {
		return 'days';
	} else if (timeSpan.lastIndexOf('h') == delimiterIdx) {
		return 'hours';
	} else if (timeSpan.lastIndexOf('m') == delimiterIdx) {
		return 'minutes';
	} else {
		return 'hours';
	}
}
