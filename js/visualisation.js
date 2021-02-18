
var DEFAULT_WIDTH = 640;
var DEFAULT_HEIGHT = 450;

class Visualisation {
	/**
	 * Add an SVG component to the container (which must have an id) and
	 * create a visualisation tied to the given data set that will provide
	 * a .data property and produces/consumes data selection events.
	 **/
	constructor(container, dataset, width, height) {
		if(typeof width == 'undefined') width = DEFAULT_WIDTH;
		if(typeof height == 'undefined') height = DEFAULT_HEIGHT;
		this.width = width; // default, can be safely overwritten by subclasses
		this.height = height;
		this.dataset = dataset; // generally not required, but we'll keep it
		this.useElementListeners = false;
		// Listen to selection events
		if(typeof dataset.listeners != 'undefined')
			dataset.listeners.push(this); //usually just the base dataset will have this
		else {
			// otherwise, each point is a partition that this needs to listen to
			this.useElementListeners = true;
		}

		this.filter = function(d){return true}; //no filtering
		this.colourAttribute = null;

		// Here we work d3-style
		this.svg = d3.select('#'+container.id).append('svg')
				.attr('width',width).attr('height',height);
		this.palette = null;
	}

	setFilter(filter) {
		this.filter = filter;
		return this;
	}

	setPalette(palette) {
		if(palette.attr != null)
			this.colourAttribute = palette.attr;
		this.palette = palette;
		return this;
	}

	/**
	 * Update the selected properties of the view of the given data.
	 **/
	updateSelection(changedData) {
		//when overriding, traverse or lookup the view for each datum
		return this;
	}

	/**
	 * For plots that want a standard x axis via d3 this provides a consistent look.
	 * This is a thick axis line with a reasonably large number of ticks.
	 **/
	createXAxis(chartArea,xScale) {
		let xAxis = chartArea.append('g').attr('transform','translate(0,'+this.height+')');
		if(typeof this.ordinal == 'undefined' || !this.ordinal)
			xAxis.call(d3.axisBottom(xScale).tickFormat(d3.format(".4")) );
		else
			xAxis.call(d3.axisBottom(xScale));
		xAxis.selectAll('path').attr('stroke-width',2).attr('shape-rendering','crispEdges');
		return xAxis;
	}
	/**
	 * Adds a d3 y axis with standard look.
	 * This has no vertical bar, approximately 5 ticks and horizontal grid lines.
	 **/
	createYAxis(chartArea,yScale) {
		let width = this.width;
		//grid lines
		let yLines = chartArea.append('g')
			.call(d3.axisLeft(yScale)
				.ticks(5).tickFormat("")
				.tickSize(-width)
				.tickSizeOuter(0)
			);
		yLines.selectAll('.tick line').attr('stroke-opacity',0.25);
		yLines.selectAll('path').remove();
		// main axis
		let yAxis = chartArea.append('g')
			.call(d3.axisLeft(yScale)
				.ticks(5).tickFormat(d3.format(".4")) );
		yAxis.selectAll('path').remove();
		yAxis.selectAll('.tick line').remove();
		return yAxis;
	}
}

/**
 * The set of colours to render with.
 * This includes functions for standard + selected colour pairings.
 * It provides a base colour pairing as well as pairings for discrete attribute values.
 * Finally, for real-valued colours it can produce a gradient given minimum and maximums.
 *
 * Standard Palettes appear below the class definition.
 **/
class Palette {
	constructor(colourScheme) {
		this.colours = colourScheme.colours;
		this.selected = colourScheme.selected;
		this.colourNames = colourScheme.names;
		
		this.labels = [];
		for(var i = 0; i < this.colourNames.length; i++)
			this.labels.push("");
		this.attrIndex = {};
		this.baseIndex = 0;
		this.attr = null;
	}

	/**
	 * Assign a colour to each value of the given discrete attribute.
	 * Fixed is an object with an property for each value assigning a 
	 * specific colour name. Optional.
	 **/
	discrete(data, attribute, fixed) {
		this.attr = attribute;
		return this;
	}

	/**
	 * When all colours are fixed for a discrete attribute
	 * Anything not specified will be shown in the first unused colour.
	 * Attributes can be grouped using labels that map attribute name -> label
	 **/
	custom(data,attribute, values, labels) {
		this.attr = attribute;
		//assign colours to indices
		let usedIndices = new Set();
		for(let a in values) {
			if(values.hasOwnProperty(a)) {
				let index = -1;
				for(let i = 0; index == -1 && i < this.colourNames.length; i++) {
					if(this.colourNames[i] == values[a])
						index = i;
				}
				usedIndices.add(index);
				this.attrIndex[a] = index;
				this.labels[index] = a;
			}
		}
		//now find an unused colour for all other attributes
		this.baseIndex = -1;
		for(let i = 0; this.baseIndex == -1 && i < this.colours.length; i++)
			if(!usedIndices.has(i))
				this.baseIndex = i;
		
		//TODO:.. if none are found, create a grey colour
		
		// if any other attribute values exist, assign an "other" label to the base index
		for(let i = 0; i < data.data.length; i++) {
			let a = data.data[i][this.attr];
			if(!this.attrIndex.hasOwnProperty(a)) {
				this.labels[this.baseIndex] = "Other";
				this.attrIndex["Other"] = this.baseIndex;
				break;
			}
		}
		for(let a in this.attrIndex)
			if(this.attrIndex.hasOwnProperty(a) && this.attrIndex[a] == -1)
				this.attrIndex[a] = this.baseIndex;
		if(typeof labels != 'undefined') {
			//overwrite any labels. For a labelled attribute, update its index
			for(let label in labels) { 
				if(this.attrIndex.hasOwnProperty(label)) {
					let index = this.attrIndex[label];
					this.labels[index] = labels[label];
				}
				else console.log("WARNING: grouping "+label+" but no such attribute.");
			}
		}
		return this;
	}

	numeric(data, attribute) {
		this.attr = attribute;
		return this;
	}

	get baseColour() {
		return this.colours[this.baseIndex];
	}
	get baseSelectedColour() {
		return this.selected[this.baseIndex];
	}

	getColour(d) {
		let index = this.baseIndex;
		if(this.attrIndex.hasOwnProperty(d[this.attr]))
			index = this.attrIndex[d[this.attr]];
		return this.colours[index];
	}

	getSelectedColour(d) {
		let index = this.baseIndex;
		if(this.attrIndex.hasOwnProperty(d[this.attr]))
			index = this.attrIndex[d[this.attr]];
		return this.selected[index];
	}

	getNames() {
		//get the name to go with each colour. Null for unused colours.
		let names = [];
		for(let a in this.attrIndex) {
			if(this.attrIndex.hasOwnProperty(a)) {
				let index = this.attrIndex[a];
				while(names.length <= index)
					names.push(null);
				names[index] = this.labels[index];
			}
		}
		return names;
	}


	selectCategory(data, index) {
		let s = [];
		let ds = [];
		for(let i = 0; i < data.data.length; i++) {
			let willSelect = (this.attrIndex[data.data[i][this.attr]] == index);
			let isSelected = data.data[i].selected;
			if(willSelect && !isSelected)
				s.push(data.data[i]);
			else if(isSelected && !willSelect)
				ds.push(data.data[i]);
		}
		data.deselect(ds);
		data.select(s);
	}

	unionCategory(data, index) {
		let ds = [];
		for(let i = 0; i < data.data.length; i++) {
			let willSelect = (this.attrIndex[data.data[i][this.attr]] == index);
			let isSelected = data.data[i].selected;
			if(isSelected && !willSelect)
				ds.push(data.data[i]);
		}
		data.deselect(ds);
	}

	/**
	 * Generate an HTML key for a palette shared by one or more visualisations.
	 * The shape can be circle, square or rounded, the selection of which should be
	 * based on the visualisations this key relates to.
	 **/
	generateKey(shape,outlined,data) {
		if(typeof shape == 'undefined')
			shape = 'square';
		if(typeof outlined == 'undefined')
			outlined = false;
		let key = document.createElement('div');
		key.classList.add('key');
		let names = this.getNames();

		//now can write them out in order
		let palette = this;
		let finalMark = null;
		let finalText = null
		for(let i = 0; i < names.length; i++) {
			let name = names[i];
			if(name == null) continue;
			let mark = document.createElement('span');
			let style = "background-color:"+this.colours[i]+";";
			if(shape == 'rounded') style += "border-radius:2px;";
			if(outlined) style += "border: 1px solid;";
			mark.style = style;
			mark.classList.add('keyicon');
			let txt = document.createElement('span');
			txt.innerHTML = name;
			txt.classList.add('keytext');
			if(typeof data != 'undefined') {
				// add on-click select to the shape
				(function(index) {
					mark.onclick = function(ev) {
						if(ev.altKey)
							palette.unionCategory(data,index);
						else
							palette.selectCategory(data,index);
					};
				})(i);
			}
			if(name == "Other") {
				finalMark = mark;
				finalText = txt;
				continue;
			}
			key.appendChild(mark);
			key.appendChild(txt);
		}
		if(finalMark != null) {
			key.appendChild(finalMark);
			key.appendChild(finalText);
		}
		return key;
	}

}

//TODO: 5th colour: purple
var DEFAULT_COLOURS = {
	colours: ["#205880","#6c0000","#ec8a00","#497b02"],
	selected:["#6398b4","#A34648","#ffbd48","#8fcb81"],
	names:   ["blue","red","yellow","green"]
};

//a lighter scheme, focusing on the selected data with a deeper colour
var LIGHTER = {colours:["#7daccc","#d67278"],selected:["#105594","#bc0f19"],names:["blue","red"]};

