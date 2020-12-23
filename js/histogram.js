
// Use this in place of a Distribution plot when you want to be able to fire selections by
// clicking on columns or when the values for counts (y axis) are important.
// The data set should be a partitioning with one partition for each histogram bin, partition labels can be numeric.
//
// Refer to Partition.partitionToBins for suitable partitioning.
class Histogram extends Visualisation {
	constructor(container, dataset, width, height) {
		super(container,dataset, width, height);
		if(typeof width == 'undefined') width = DEFAULT_WIDTH;
		if(typeof height == 'undefined') height = DEFAULT_HEIGHT;

		this.margin = {top: 10, right: 10, bottom: 20, left: 60};
		
		// the stored width and height represent the area to plot data in
		this.width = width - this.margin.left - this.margin.right;
		this.height = height - this.margin.top - this.margin.bottom;

		this.discrete = false;
		
		this.chartArea = this.svg.append('g')
			.attr('transform','translate('+this.margin.left+','+this.margin.top+')');
	}

	prepareAxes() {
		let chart = this;
		//always plot name against count
		let firstBin = 0;
		let lastBin = 0;
		let maxHeight = 0;
		for(let i = 0; i < this.dataset.data.length; i++) {
			let d = this.dataset.data[i];
			if(this.filter(d)) {
				lastBin = i;
				if(d.count > maxHeight)
					maxHeight = d.count;
			}
			else if(firstBin == i) {
				firstBin = i+1;
			}
		}
		//users can override the cutoff by setting discrete themselves before calling plot()
		this.discrete = maxHeight < 30;

		let binWidth = (this.dataset.data[this.dataset.data.length-1].label - this.dataset.data[0].label) / this.dataset.data.length;
		//x scale between first and last bins
		this.x = d3.scaleLinear().domain([this.dataset.data[firstBin].label, this.dataset.data[lastBin].label+binWidth]).range([0,this.width]);
		this.y = d3.scaleLinear().domain([0,maxHeight]).range([this.height,0]);
		
		this.createYAxis(this.chartArea,this.y);
		this.createXAxis(this.chartArea, this.x);
		this.binWidth = binWidth;
		return this;
	}

	plot() {
		let chart = this;
		let bars = this.chartArea.selectAll('rect')
			.data(this.dataset.data, function(d){return d.id;});
		let newBars = bars.enter()
			.filter(chart.filter)
			.append('rect')
				.on('click',function(ev,d) {chart.dataset.select([d]); })
				.attr('x',function(d) {return chart.x(d.label);})
				.attr('y', function(d) {return chart.y(d.count);})
				.attr('height',function(d) {return chart.y(0) - chart.y(d.count);})
				.attr('width', function(d) {return chart.x(d.label + chart.binWidth) - chart.x(d.label) - 1;})
				.style('fill',function(d) {return chart.palette.getColour(d);});
		bars.exit().remove();
		
		// then create all the selection bars, initially with no height

		let selectionBars = this.chartArea.selectAll('.selectedbars')
			.data(this.dataset.data, function(d){return d.id;})
			.enter()
			.filter(chart.filter)
			.append('rect')
				.attr('class','selectedbars')
				.attr('x',function(d) {return chart.x(d.label);})
				.attr('y', function(d) {return chart.y(d.count*d.selected);})
				.attr('height',function(d) {return chart.y(0) - chart.y(d.count*d.selected);})
				.attr('width', function(d) {return chart.x(d.label + chart.binWidth) - chart.x(d.label) - 1;})
				.style('fill',function(d) {return chart.palette.getSelectedColour(d);})
				.on('click',function(ev,d) { chart.dataset.deselect([d]); });
		
		// if we require element selectors (which histograms usually do), this is where they go
		let elementSelector = function(rect,d) {rect.setAttribute('y',chart.y(d.count*d.selected));rect.setAttribute('height',chart.y(0)-chart.y(d.count*d.selected));};
		//apply the listeners manually.
		if(this.useElementListeners) {
			let ns = selectionBars.nodes();
			for(let i = 0; i < ns.length; i++) {
				(function(n,d) {
					d.listeners.push(function(){elementSelector(n,d);});
				})(ns[i],ns[i].__data__);
			}
		}
		return this;
	}

	updateSelection(changedData) {
		//update all bar heights
		let bars = this.chartArea.selectAll('.selectedbars')
			.data(changedData, function(d){return d.id;})
			.attr('y', function(d) {return chart.y(d.count*d.selected);})
			.attr('height',function(d) {return chart.y(0) - chart.y(d.count*d.selected);})
		return this;
	}

}

