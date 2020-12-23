
/**
 * A pseudo-datum that represents a set of data. Its values are its count (cardinality) and proportion selected.
 * It is disjoint with other Partitions in the same Partitioning.
 **/
class Partition {
	constructor(label, data, fields) {
		this.label = label;
		// data are the parents in the hierarchy
		this.data = data;
		this.count = data.length;
		// partitions can form a hierarchy. Raw data is at depth 0.
		this.depth = 1;
		// number of datum in this set that are selected
		this.selectedSize = 0;
		// various stats to keep track of
		this.stats = {};
		for(let f in fields) {
			this.stats[f] = {mean:0,median:0,max:Number.MAX_SAFE_INTEGER,min:Number.MIN_SAFE_INTEGER,meanDatum:null,medianDatum:null,maxDatum:null,minDatum:null};
		}

		// connections representing their hierarchical structure
		this.children = []; //deeper partitions that include this one
		this.listeners = []; //elements in visualisations that represent this
	}
	
	get selected() {
		if(this.data.length == 0) return 0.0;
		return this.selectedSize*1.0/this.data.length;
	}

	addSelected(addedSize) {
		if(addedSize == 0) return;
		this.selectedSize += addedSize;
		//refresh listeners 
		for(let i = 0; i < this.listeners.length; i++)
			this.listeners[i]();
		//propagate down
		for(let i = 0; i < this.children.length; i++)
			this.children[i].addSelected(addedSize);
	}

	removeSelected(removedSize) {
		if(removedSize == 0) return;
		this.selectedSize -= removedSize;
		for(let i = 0; i < this.listeners.length; i++)
			this.listeners[i]();
		for(let i = 0; i < this.children.length; i++)
			this.children[i].removeSelected(removedSize);
	}
}

/**
 * A set of disjoint Partitions.
 * Its partitions can be used as a data set for visualisation.
 * This is the interface between visualisations and partitions for selection events.
 **/
class Partitioning {
	constructor(name, parent) {
		this.depth = 1;
		this.data = []; //partitions
		this.name = name;
		this.units = {};
		this.attributes = [];
		this.parent = parent;
	}

	//wholly selects the specified partitions
	select(ps) {
		//collate all children that will become newly selected. Push into the parent Partitioning.
		let parentSelected = [];
		for(let i = 0; i < ps.length; i++)
			for(let j = 0; j < ps[i].data.length; j++)
				if(ps[i].data[j].selected < 1.0)
					parentSelected.push(ps[i].data[j]);
		if(parentSelected.length > 0)
			this.parent.select(parentSelected);
		// Note that at depth 0 (Data set) the partitioning will set the underlying selections and start propagating up.
	}

	//wholly deselects the specified partitions
	deselect(ps) {
		let parentDeselected = [];
		for(let i = 0; i < ps.length; i++)
			for(let j = 0; j < ps[i].data.length; j++)
				if(ps[i].data[j].selected > 0.0)
					parentDeselected.push(ps[i].data[j]);
		if(parentDeselected.length > 0)
			this.parent.deselect(parentDeselected);
	}

	withUnits(attribute) {
		if(attribute == 'count') { //we have this one
			let u = this.units[attribute];
			if(u.units == "" && u.scale == "")
				return attribute;
			return attribute+" ("+u.scale+u.units+")";
		}
		if(this.parent != null)
			return this.parent.withUnits(attribute);
		return attribute;
	}

	rescale(deleteOld) {
		//just rescale count (TODO: and maybe numeric labels?)
		this.attributes = ["count"];
		this.units = {};
		let names = rescaleAxis("count",this.data);
		this.units["count"] = {scale:names[1],units:names[2]};
		return this;
	}
}

/** Comparator for sorting data in a DataSet (or Partition) **/
function dComp(a,b) { return b.id-a.id; }

/**
 * Size of the intersection of two sorted lists of data
 **/
function countIntersection(a,b) {
	let count = 0;
	if(a.length == 0 || b.length == 0)
		return count;
	let bIndex = 0;
	let aIndex = 0;
	let nextA = a[aIndex].id;
	let nextB = b[bIndex].id;
	while(aIndex < a.length && bIndex < b.length) {
		while(bIndex < b.length && b[bIndex].id < nextA)
			bIndex++;
		if(bIndex == b.length) break;
		nextB = b[bIndex].id;
		while(aIndex < a.length && a[aIndex].id < nextB)
			aIndex++;
		if(aIndex == a.length) break;
		nextA = a[aIndex].id;
		if(nextA == nextB) {
			count++;
			aIndex++;
			bIndex++;
		}
	}
	return count;
}

/** 
 * The depth 0 partition and singleton partitioning.
 * This provides selection event propagation into the partition hierarchy.
 **/
class DataSet {

	constructor(data) {
		this.data = data;
		this.depth = 0;
		this.selectedSize = 0;
		this.children = []; //Partitionings of this data set
		this.listeners = []; //visualisations of this data set

		this.attributes = []; //list of attribute names
		this.units = {}; //name -> scale,unit strings
		
		//add ids and labels if required. For use by d3 and so each datum is a Partition
		for(let i = 0; i < data.length; i++) {
			if(!data[i].hasOwnProperty('id')) data[i].id = i;
			data[i].selected = 0.0;
			data[i].label = ""+i;
		}
	}

	withUnits(attribute) {
		if(this.units.hasOwnProperty(attribute)) {
			let u = this.units[attribute];
			if(u.units == "" && u.scale == "")
				return attribute;
			return attribute+" ("+u.scale+u.units+")";
		}
		return attribute;
	}

	rescale(deleteOld) {
		if(this.data.length == 0) return;
		this.attributes = [];
		this.units = {};
		// rescale and separate all attributes' units
		let exemplar = this.data[0];
		let oldAttributes = [];
		for(let prop in exemplar) 
			if(prop != 'id' && prop != 'label' && exemplar.hasOwnProperty(prop))
				oldAttributes.push(prop);
		let toRemove = [];
		for(let i = 0; i < oldAttributes.length; i++) {
			let prop = oldAttributes[i];
			let names = rescaleAxis(prop,this.data);
			this.attributes.push(names[0]);
			if(names[0] != prop) toRemove.push(prop);
			this.units[names[0]] = {scale:names[1],units:names[2]};
			
		}
		// rename the attributes in every datum (create new property, delete old one)
		if(deleteOld) {
			for(let i = 0; i < this.data.length; i++) {
				let d = this.data[i];
				for(let j = 0; j < toRemove.length; j++)
					delete d[toRemove[j]];
			}
		}
		return this;
	}

	get selected() {
		if(this.count== 0) return 0.0;
		return this.selectedSize*1.0/this.count;
	}

	select(ds) {
		//no parent partitioning, so we can begin propagating up
		//first update individual datum selections. Remove any already selected.
		let needSort = false;
		for(let i = ds.length-1; i >= 0; i--) {
			if(ds[i].selected == 1.0) {
				let d = ds.pop();
				if(i < ds.length) {
					ds[i] = d;
					needSort = true;
				}
			} 
			else {
				ds[i].selected = 1.0;
				this.selectedSize++;
			}
		}
		if(needSort) 
			ds.sort(dComp);

		//For each partitioning of this data...
		for(let i = 0; i < this.children.length; i++) {
			let partitioning = this.children[i];
			// .. determine the number of new selections to push into each partition
			for(let j = 0; j < partitioning.data.length; j++) {
				let partition = partitioning.data[j];
				partition.addSelected( countIntersection(ds,partition.data) );
			}
		}
		//Finally, update any visualisations listening to this data set
		for(let i = 0; i < this.listeners.length; i++)
			this.listeners[i].updateSelection(ds);
	}

	deselect(ds) {
		let needSort = false;
		for(let i = ds.length-1; i >= 0; i--) {
			if(ds[i].selected == 0.0) {
				let d = ds.pop();
				if(i < ds.length) {
					ds[i] = d;
					needSort = true;
				}
			} 
			else {
				ds[i].selected = 0.0;
				this.selectedSize--;
			}
		}
		if(needSort) 
			ds.sort(dComp);
		for(let i = 0; i < this.children.length; i++) {
			let partitioning = this.children[i];
			for(let j = 0; j < partitioning.data.length; j++) {
				let partition = partitioning.data[j];
				partition.removeSelected( countIntersection(ds,partition.data) );
			}
		}
		for(let i = 0; i < this.listeners.length; i++)
			this.listeners[i].updateSelection(ds);
	}

	/**
	 * Helper function for producing a partitioning based on discrete values.
	 **/
	partitionByField(field) {
		let values = {}; //unique values
		for(let i = 0; i < this.data.length; i++)
			values[this.data[i][field]] = true;
		let partitions = [];
		for(let v in values) {
			if(values.hasOwnProperty(v)) {
				let subData = [];
				for(let i = 0; i < this.data.length; i++)
					if(this.data[i][field] == v)
						subData.push(this.data[i]);
				partition = new Partition(v,subData,[]);
				partition.id = partitions.length;
				partitions.push(partition);
			}
		}
		let partitioning = new Partitioning(field, this);
		partitioning.data = partitions;
		partitioning.count = partitions.length;
		this.children.push(partitioning);
		return partitioning;
	}

	/**
	 * Partitions the values of field into bins according to Freedmen-Diaconis method.
	 * If minBins/maxBins are defined the number of bins will be restricted to within this range.
	 **/
	partitionToBins(field, minBins, maxBins) {
		if(typeof minBins == 'undefined') {
			minBins = 0;
			maxBins = 1000;
		}
		else if(typeof maxBins == 'undefined')
			maxBins = 1000;
		let binWidth = 0;
		let minValue = this.data[0][field];
		let maxValue = minValue;
		for(let i = 1; i < this.data.length; i++) {
			let v = this.data[i][field];
			if(v > maxValue) maxValue = v;
			if(v < minValue) minValue = v;
		}
		if(minBins != maxBins) {
			//Freedman-Diaconis
			let vs = [];
			for(let i = 0; i < this.data.length; i++)
				vs.push(this.data[i][field]);
			vs.sort(function(a,b) { return a-b; });
			let iqr = vs[Math.floor(vs.length-1-vs.length/4)] - vs[Math.floor(vs.length/4)];
			binWidth = iqr*2 / Math.cbrt(vs.length);
			minValue = vs[0];
			maxValue = vs[vs.length-1];
		}
		else
			binWidth = (maxValue - minValue) / (numBins-0.1); //ensure rounding doesn't break things

		let numBins = Math.ceil( (maxValue-minValue)/binWidth );
		if(numBins > maxBins || numBins < minBins) {
			numBins = Math.min(maxBins, Math.max(minBins,numBins));
			binWidth = (maxValue - minValue) / (numBins-0.1);
		}
		//now perform the partitioning
		let splits = [];
		for(let i = 0; i < numBins; i++) splits.push([]);
		for(let i = 0; i < this.data.length; i++) {
			let v = this.data[i][field];
			let bin = Math.ceil( (v-minValue) / binWidth );
			if(bin >= splits.length) bin = splits.length-1;
			splits[bin].push(this.data[i]);
		}
		let partitions = [];
		for(let i = 0; i < numBins; i++) {
			//label is the lower bin value
			let partition = new Partition(minValue+(i*binWidth),splits[i],[]);
			partition[field] = partition.label;
			partition.id = i;
			partitions.push(partition);
		}
		let partitioning = new Partitioning(field, this);
		partitioning.data = partitions;
		partitioning.count = partitions.length;
		this.children.push(partitioning);
		return partitioning;
	}
}
