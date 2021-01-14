class ScatterPlot extends Visualisation {
	constructor(container, dataset, width, height) {
		super(container,dataset, width, height);
		if(typeof width == 'undefined') width = DEFAULT_WIDTH;
		if(typeof height == 'undefined') height = DEFAULT_HEIGHT;
		this.sizeAttribute = null;

		this.margin = {top: 10, right: 10, bottom: 20, left: 60};
		
		// the stored width and height represent the area to plot data in
		this.width = width - this.margin.left - this.margin.right;
		this.height = height - this.margin.top - this.margin.bottom;

		//estimate a good radius: cover about 1/6th of the plot if nothing overlaps
		this.radius = Math.floor( Math.sqrt( width*height/(dataset.data.length+1))/6 );
		this.radius = Math.max(2,Math.min(10,this.radius));
		this.chartArea = this.svg.append('g')
			.attr('transform','translate('+this.margin.left+','+this.margin.top+')');
	}

	prepareAxes(xAttr,yAttr,logX,logY) {
		this.xAttr = xAttr;
		this.yAttr = yAttr;
		let chart = this;
		let xValues = function(d) {if(chart.filter(d)) return d[xAttr]; else return Number.NaN;}
		let yValues = function(d) {if(chart.filter(d)) return d[yAttr]; else return Number.NaN;};
		let xRange = d3.extent(this.dataset.data, xValues);
		let yRange = d3.extent(this.dataset.data, yValues);
		//x and y are the scales
		if(logX && xRange[0] > 0) this.x = d3.scaleLog().domain(xRange).range([0,this.width]);
		else this.x = d3.scaleLinear().domain(xRange).range([0,this.width]);
		if(logY && yRange[0] > 0) this.y = d3.scaleLog().domain(yRange).range([this.height,0]);
		else this.y = d3.scaleLinear().domain(yRange).range([this.height,0]);
		//then we create axis elements for them
		this.createYAxis(this.chartArea, this.y);
		this.createXAxis(this.chartArea, this.x);
		return this;
	}

	selectArea(ds) {
		if(typeof ds == 'undefined' || ds == null || typeof ds.sourceEvent == 'undefined') return;
		let selection = null;
		if(ds.selection == null) selection = [[0,0],[0,0]];
		else selection = ds.selection;
		let xSelection = [this.x.invert(selection[0][0]),this.x.invert(selection[1][0])];
		let ySelection = [this.y.invert(selection[0][1]),this.y.invert(selection[1][1])];
		let minX = Math.min(xSelection[0],xSelection[1]);
		let maxX = Math.max(xSelection[0],xSelection[1]);
		let minY = Math.min(ySelection[0],ySelection[1]);
		let maxY = Math.max(ySelection[0],ySelection[1]);
		//now do a non-d3 select: we're leaving the visualisation
		let newSelection = [];
		let unSelection = [];
		let data = this.dataset.data;
		for(let i = 0; i < data.length; i++) {
			let d = data[i];
			let x = d[this.xAttr];
			let y = d[this.yAttr];
			let selected = x >= minX && x <= maxX && y >= minY && y <= maxY;
			if(selected && d.selected < 1.0)
				newSelection.push(d);
			else if(!selected && d.selected > 0.0)
				unSelection.push(d);
		}
		if(unSelection.length > 0) {
			this.dataset.deselect(unSelection);
		}
		if(newSelection.length > 0) {
			this.dataset.select(newSelection);
		}
	}

	setSizeAttribute(attr) {
		this.sizeAttribute = attr;
		this.sizeFunction = Math.sqrt;
		this.sizeScale = 1.0;
		//find suitable range, use sqrt of attribute as size
		let minSize = 0;
		let maxSize = 0;
		for(let i = 0; i < this.dataset.data.length; i++) {
			let v = this.dataset.data[i][attr];
			if(v < minSize || minSize == 0) minSize = v;
			if(v > maxSize) maxSize = v;
		}
		minSize = Math.sqrt(Math.max(0,minSize));
		maxSize = Math.sqrt(Math.max(0,maxSize));
		//scale lower limit sets the min size to 2
		//scale upper limit sets the max size to 30
		this.sizeScale = Math.min(2.0/minSize, 30.0/maxSize);
		//TODO: if bounds are still too large, move to log
		return this;
	}

	plot() {
		let chart = this;
		//add any data that doesn't have a point yet
		let points = this.chartArea.selectAll('.scatterpoint')
			.data(this.dataset.data,function(d){return d.id;});
		let newPoints = points.enter()
			.filter(chart.filter)
			.append('circle')
				.attr('cx',function(d){return chart.x(d[chart.xAttr]);})
				.attr('cy',function(d){return chart.y(d[chart.yAttr]);})
				.attr('class','scatterpoint')
				.style('fill',function(d){return chart.palette.getColour(d);});
		if(this.sizeAttribute != null) {
			newPoints.attr('r',function(d) {return Math.max(1,Math.floor(chart.sizeFunction(d[chart.sizeAttribute])*chart.sizeScale));});
		}
		else
			newPoints.attr('r',chart.radius); //adjust by sizeAttr
		points.exit().remove();
		
		// then add the brush for selecting
		this.clearedSelector = true;
		this.selector = d3.brush().on("start",function(ds){if(typeof ds.sourceEvent != 'undefined') chart.clearedSelector = false;}).on("end",function(ds){chart.selectArea(ds); if(!chart.clearedSelector){chart.clearedSelector=true;chart.chartArea.call(chart.selector.move,null);}});
		this.selector.extent( [[0,0],[this.width,this.height]]);
		this.chartArea.call(this.selector);

		//if we require element listeners, run through applying them now (they should update the selected visuals of their datum)
		let elementSelector = function(point,d) {
			if(d.selected == 1.0) point.classList.add('selected'); else point.classList.remove('selected');
			if(d.selected > 0.5) point.style.fill = chart.palette.getSelectedColour(d);
			else point.style.fill = chart.palette.getColour(d);
		};
		if(this.useElementListeners) {
			let ns = points.enter().nodes();
			for(let i = 0; i < ns.length; i++) {
				(function(n,d) {
					d.listeners.push(function(){elementSelector(n,d);});
				})(ns[i],ns[i].__data__);
			}
		}
		return this;
	}
	updateSelection(changedData) {
		let chart = this;
		let points = this.chartArea.selectAll('.scatterpoint')
			.data(changedData,function(d){return d.id;});
		points.filter(chart.filter)
			.attr('class',function(d){if(d.selected == 1.0) return 'scatterpoint selected'; else return 'scatterpoint';})
			.style('fill',function(d){
				if(d.selected > 0.5)
					return chart.palette.getSelectedColour(d);
				else
					return chart.palette.getColour(d);
			});
		return this;
	}
}
