function loadGraphEvolution(target, dashboardTitle, graphTitle) {

	$("#graphEvolution").html("");
	$("#graphEvolutionWarning").hide();
	$("#graphEvolutionTitle").text("Evolution of graph " + graphTitle); // + " on dashboard " + dashboardTitle);
	$("#graphEvolutionProgress").show();
	$("#graphEvolutionProgressText").text("Rendering graph evolution");
	renderGraphEvolution(graphTitle, target);
	$("#graphEvolutionProgress").hide();
}

function renderGraphEvolution(graphTitle, graphUrl) {
	var htmlContent="";
	var colorList=getColorList(graphUrl);
	var metricsList = getMetricsListFromTargetUri(graphUrl);
	var w = parseInt($(".lightbox-content").css("width"));
	var h = parseInt($(".lightbox-content").css("height"));
	var margin = {
		right: w * 0.15,
		left: w * 0.15
	},
		width = w - margin.left - margin.right,
		heightStd = width * 3 / 4;
		heightWide = width * 9 / 16;
		height = heightWide;

	var extraGraphiteParams='&title=&hideLegend=true&fontSize=11&width=' + width + '&height=' + height

	htmlContent+='<img src="' + graphUrl + extraGraphiteParams + '&from=-6hours&title=Graph for the last 6 hours:"><br/>' + "\n";
	htmlContent+='<img src="' + graphUrl + extraGraphiteParams + '&from=-1days&title=Graph for the last 1 days:"><br/>' + "\n";
	htmlContent+='<img src="' + graphUrl + extraGraphiteParams + '&from=-1week&title=Graph for the last 1 weeks:"><br/>' + "\n";
	htmlContent+='<img src="' + graphUrl + extraGraphiteParams + '&from=-1month&title=Graph for the last 1 month:"><br/>' + "\n";
	htmlContent+='<img src="' + graphUrl + extraGraphiteParams + '&from=-1year&title=Graph for the last 1 year:"><br/>' + "\n";

	$("#graphEvolution").html(htmlContent);

	$("#graphEvolutionLegend").css("min-height", parseInt($(".lightbox-content").css("height")) - 30);
	htmlContent="";
	htmlContent+='<ul class="ui-sortable">';
	$.each(metricsList, function(metricIndex, metricName) {
 		var moduledIndex = metricIndex % colorList.length;
		htmlContent+='<li class="line"><div class="swatch" style="line-height: 200%; background-color: ' + colorList[moduledIndex] + ';"></div><span class="label">' + metricName + '</span></li>';
	});
	htmlContent+='</ul>';

	$("#graphEvolutionLegend").html(htmlContent);
}