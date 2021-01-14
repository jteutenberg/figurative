/** 
 * Functions for setting up the DOM elements for a figure containing one or more visualisations. 
 * This formatting the title, visualisation sub-titles, and axis legends.
 **/

/**
 * This calls all necessary functions based on a figure declaration object.
 * Individual functions can be seen below.
 **/
function setupFigure(desc, palette, dataset) {
	let figDiv = createFigure(desc.title);
	//TODO: layout
	for(let i = 0; i < desc.charts.length; i++) {
		createVisualisation(figDiv, desc.charts[i].subtitle, desc.charts[i].id);
	}
	if(desc.hasOwnProperty("key")) {
		addKey(figDiv,palette,desc.key.shape,desc.key.outline, dataset);
	}

	return figDiv;
}

/**
 * Finds visualisation divs by id and sets up a chart in each, as defined by chartDescriptions.
 * All charts created by this function call will share the given dataset and palette.
 **/
function insertCharts(chartDescriptions, dataset, palette) {
	let charts = [];
	for(let i = 0; i < chartDescriptions.length; i++) {
		let d = chartDescriptions[i];
		let holder = document.getElementById(d.id);
		if(typeof holder == 'undefined' || holder == null) {
			console.log("Error: no DOM element with id "+d.id+" for a chart.");
			continue;
		}
		if(d.type == 'scatter') {
			let chart = new ScatterPlot(holder, dataset, d.width, d.height);
			chart.setPalette(palette);
			let logX = false;
			let logY = false;
			if(d.hasOwnProperty('logX')) {
				logX = d.logX;
				chart.setFilter(function(v) {return v[d.x] > 0;});
			}
			if(d.hasOwnProperty('xRange')) {
				let range = d['xRange'];
				if(d.hasOwnProperty('logX') && d.logX) range = [Math.max(0,range[0]),Math.max(0,range[1])];
				chart.setFilter(function(v) {return v[d.x] > range[0] && v[d.x] < range[1];});
			}
			if(d.hasOwnProperty('logY')) logY = d.logY;
			if(d.hasOwnProperty('size')) chart.setSizeAttribute(d.size);
			chart.prepareAxes(d.x,d.y,logX,logY);
			charts.push(chart);
		}
		if(d.type == 'distribution') {
			let chart = new Distribution(holder, dataset, d.width, d.height);
			chart.setPalette(palette);
			if(d.hasOwnProperty('xRange')) {
				let range = d['xRange'];
				chart.setFilter(function(v) {return v[d.x] > range[0] && v[d.x] < range[1];});
			}
			chart.prepareAxes(d.x);
			charts.push(chart);
		}
		if(d.type == 'histogram') {
			d.y = "count"; // fixed for histograms
			let chart = new Histogram(holder, dataset, d.width, d.height);
			chart.setPalette(palette);
			if(d.hasOwnProperty('xRange')) {
				let range = d['xRange'];
				chart.setFilter(function(v) {return v[d.x] > range[0] && v[d.x] < range[1];});
			}
			chart.prepareAxes();
			charts.push(chart);
		}
		if(d.hasOwnProperty('yLabel') && d.yLabel)
			createYLabel(holder,dataset.withUnits(d.y));
		if(d.hasOwnProperty('xLabel') && d.xLabel)
			createXLabel(holder,dataset.withUnits(d.x));
	
	}
	return charts;
}

// create* functions return a new DOM object that has been added
// add* functions return the parent object that was passed in

/**
 * Creates a figure div with the given title text, also returning an area that a key can be added to.
 **/
function createFigure(titleText, figureDiv) {
	if(typeof figureDiv == 'undefined' || figureDiv == null)
		figureDiv = document.createElement('div');
	figureDiv.classList.add('figure');
	if(typeof titleText != 'undefined')
		figureDiv.innerHTML = "<h2>"+titleText+"</h2>";
	let keyArea = document.createElement('div');
	figureDiv.appendChild(keyArea);
	keyArea.classList.add('key');
	return figureDiv;
}

function createVisualisation(figure, subtitleText, id) {
	let subfig = document.createElement('div');
	subfig.id = id;
	subfig.classList.add('subfigure');
	let title = document.createElement('span');
	title.classList.add('subtitle');
	if(typeof subtitleText != 'undefined' && subtitleText != null) {
		title.innerHTML = subtitleText;
		subfig.appendChild(title);
		subfig.append(document.createElement('br'));
	}
	figure.appendChild(subfig);
	return subfig;
}

//TODO: automate shape selection based on which visualisations exist?
function addKey(figure, palette, shape, outline, dataset) {
	let key = null;
	for(let i = 0; key == null && i < figure.childNodes.length; i++)
		if(figure.childNodes[i].className == "key")
			key = figure.childNodes[i];
	if(key != null)
		key.appendChild( palette.generateKey(shape,outline,dataset) );
	return figure;
}

function createXLabel(subfigure, label) {
	let xlab = document.createElement('div');
	xlab.classList.add('xlabel');
	xlab.innerHTML = label;
	subfigure.appendChild(xlab);
	return xlab;
}

function createYLabel(subfigure, label) {
	let ylab = document.createElement('div');
	ylab.classList.add('ylabel');
	ylab.innerHTML = label;
	subfigure.appendChild(ylab);
	let bounds = subfigure.getBoundingClientRect();
	let labelBounds = ylab.getBoundingClientRect();
	ylab.style = "transform:translate(-"+(labelBounds.height/2)+"px,-"+(bounds.height/2)+"px) rotate(-90deg);";
	return ylab;
}
