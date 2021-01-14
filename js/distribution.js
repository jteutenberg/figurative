function kernelDensityEstimator(kernel, X) {
	return function(V) {
		return X.map(function(x) {
			return [x, d3.mean(V, function(v) { return kernel(x - v); })];
		});
	};
}
function kernelEpanechnikov(k) {
	return function(v) {
		return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
	};
}

class Distribution extends Visualisation {
	constructor(container, dataset, width, height) {
		super(container,dataset, width, height);
		if(typeof width == 'undefined') width = DEFAULT_WIDTH;
		if(typeof height == 'undefined') height = DEFAULT_HEIGHT;

		this.margin = {top: 10, right: 10, bottom: 20, left: 10};
		
		// the stored width and height represent the area to plot data in
		this.width = width - this.margin.left - this.margin.right;
		this.height = height - this.margin.top - this.margin.bottom;

		this.kernelSize = 1.0;

		this.chartArea = this.svg.append('g')
			.attr('transform','translate('+this.margin.left+','+this.margin.top+')');
	}

	prepareAxes(attr) {
		this.attr = attr;
		let chart = this;
		let values = function(d) {if(chart.filter(d)) return d[attr]; else return Number.NaN;}
		let xRange = d3.extent(this.dataset.data, values);
		this.kernelSize = (xRange[1]-xRange[0])/Math.max(10,Math.min(250,this.dataset.data.length/50));
		this.x = d3.scaleLinear().domain(xRange).range([0,this.width]);
		/*this.chartArea.append('g').attr('transform','translate(0,'+this.height+')')
			.call(d3.axisBottom(this.x).tickFormat(d3.format(".3")))
			.selectAll('path').attr('stroke-width',2).attr('shape-rendering','crispEdges');*/
		this.createXAxis(this.chartArea,this.x);
		return this;
	}
	
	plot() {
		let chart = this;
		//TODO: use x range to decide on the kernel size
		let kde = kernelDensityEstimator(kernelEpanechnikov(this.kernelSize), this.x.ticks(60));
		this.scaleFactor = 1.0;
		// split data by colour attribute
		this.splits = [];
		let densities = [];
		let colours = [];
		let splitAttr = this.palette.attr;
		let colourNames = this.palette.getNames();
		let maxHeight = 0;
		for(let j = 0; j < colourNames.length; j++) {
			if(colourNames[j] == null) continue; //unused
			let split = [];
			let splitData = [];
			for(let i = 0; i < this.dataset.data.length; i++) {
				if(this.palette.getColour(this.dataset.data[i]) == this.palette.colours[j]) {
					split.push(this.dataset.data[i][this.attr]);
					splitData.push(this.dataset.data[i]);
				}
			}
			if(split.length > 0) {
				this.splits.push(splitData);
				let d = kde(split);
				if(d.length > 0) {
					//add zeroes
					if(d[0][1] > 0)
						d.unshift([d[0][0],0]);
					if(d[d.length-1][1] > 0)
						d.push([d[d.length-1][0],0]);
					densities.push( d );
					colours.push(this.palette.colours[j]);
				}
				for(let k = 0; k < d.length; k++)
					if(d[k][1] > maxHeight) maxHeight = d[k][1];
			}
		}
		if(maxHeight > 0)
			this.scaleFactor = 1.0/maxHeight;
		// plot each density
		for(let i = 0; i < densities.length; i++) {
			let den = densities[i];
			//TODO: ensure density max is below 1.0. Also should have area 1 if possible.
			let colour = colours[i];
			this.chartArea.append("path")
				.attr("class", "distributionpath")
				.datum(den)
				.attr("fill", colour)
				.attr("d",  d3.line()
					.curve(d3.curveBasis)
					.x(function(d) { return chart.x(d[0]); })
					.y(function(d) { return chart.height-d[1]*chart.height*chart.scaleFactor; })
				);
		}
		return this;
	}
	
	updateSelection(changedData) {
		let chart = this;
		//refresh all selections, ignore changed data
		this.chartArea.selectAll(".selected").remove();
		let selectedSplits = [];
		let colours = [];
		let weight = [];
		for(let i = 0; i < this.splits.length; i++) {
			let split = this.splits[i];
			let selected = [];
			for(let j = 0; j < split.length; j++) {
				if(split[j].selected > 0.5)
					selected.push(split[j][this.attr]);
			}
			if(selected.length > 0) {
				selectedSplits.push(selected);
				colours.push(this.palette.getSelectedColour(split[0]));
				weight.push( selected.length*1.0/split.length );
			}
		}
		// recalculate the densities too
		let kde = kernelDensityEstimator(kernelEpanechnikov(this.kernelSize), this.x.ticks(60));
		for(let i = 0; i < selectedSplits.length; i++) {
			let den = kde(selectedSplits[i]);
			if(den[0][1] > 0)
				den.unshift([den[0][0],0]);
			if(den[den.length-1][1] > 0)
				den.push([den[den.length-1][0],0]);
			//render
			let colour = colours[i];
			let w = weight[i];
			this.chartArea.append("path")
				.attr("class", "distributionpath selected")
				.datum(den)
				.attr("fill", colour)
				.attr("d",  d3.line()
					.curve(d3.curveBasis)
					.x(function(d) { return chart.x(d[0]); })
					.y(function(d) { return chart.height-d[1]*w*chart.height*chart.scaleFactor; })
				);
		}
		return this;
	}

}
