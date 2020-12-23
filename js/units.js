
var SCALE_TEXT = [ 
	[0.000000001,"billionths"],
	[0.000001,"millionths"],
	[0.001, "thousandths"],
	[0.01,"hundredths"],
	[1.0,""],
	[100.0,"hundreds"],
	[1000.0,"thousands"],
	[1000000.0,"millions"],
	[1000000000.0,"billions"]
];
var SCALE_UNITS = [
	[0.000000000001,"p"],
	[0.000000001,"n"],
	[0.000001,"u"],
	[0.001,"m"],
	[1.0,""],
	[1000.0,"k"],
	[1000000.0,"M"],
	[1000000000.0,"G"],
];
var SCALE_TIME = [
	[0.000000000001,"p"],
	[0.000000001,"n"],
	[0.000001,"u"],
	[0.001,"m"],
	[1.0,""],
	[60.0,"minute"], //an "s" will get added on the end for the seconds
	[3600.0,"hour"],
	[24*3600.0,"day"]
];

/**
 * Updates all data points and returns new label, scale, and units strings.
 * It is up to the caller to replace all instances of the attribute 
 * with the new label.
 **/
function rescaleAxis(label, data) {
	let scale = 1.0;
	let name = label;
	let scaleName = ""; //e.g. m (milli-) or k (kilo-)
	let units = "";
	if(hasUnits(label)) {
		let existingScale = findLabelScale(label);
		units = existingScale[1];
		if(units == "%") { //ignore these
			//nothing
			existingScale[0] = 1.0;
		}
		else if(units == "s") { //time!
			let scaleIndex = rescaleFactor(data,label,SCALE_TIME,existingScale[0]);
			if(scaleIndex != -1) {
				scale = SCALE_TIME[scaleIndex][0];
				scaleName = SCALE_TIME[scaleIndex][1];
			}
		}
		else {
			let scaleIndex = rescaleFactor(data,label,SCALE_UNITS,existingScale[0]);
			if(scaleIndex != -1) {
				scale = SCALE_UNITS[scaleIndex][0];
				scaleName = SCALE_UNITS[scaleIndex][1];
			}
		}
		scale /= existingScale[0]; //amount to adjust values by
		name = name.substring(0,name.indexOf("(")).trim();
	} else {
		// work directly with a new text scale
		let scaleIndex = rescaleFactor(data,label,SCALE_TEXT);
		if(scaleIndex != -1) {
			scale = SCALE_TEXT[scaleIndex][0];
			scaleName = SCALE_TEXT[scaleIndex][1];
		}
	}
	//Then: rescale *every* attribute, remove its units string, create a new scale+units string for each.
	if(scale != 1.0 || name != label) {
		//apply
		for(let i = 0; i < data.length; i++) {
			let scaled = data[i][label] / scale;
			data[i][name] = scaled;
		}
	}
	return [name,scaleName,units];
}


/**
 * Whether or not the label contains metric units or
 * will require text scale.
 *
 **/
function hasUnits(label) {
	let startIndex = label.lastIndexOf("(");
	let endIndex = label.lastIndexOf(")");
	return startIndex > 0 && endIndex > startIndex && endIndex < startIndex+4;
}

/**
 * Finds an existing scale given a label that has
 * metric units.
 **/
function findLabelScale(label) {
	let startIndex = label.lastIndexOf("(");
	let endIndex = label.lastIndexOf(")");
	let scaleText = label.substring(startIndex+1,startIndex+2);
	if(endIndex < startIndex+3) return [1.0,scaleText]; //only 1 character
	let unitsText = label.substring(startIndex+2,endIndex);
	//look for a matching scale text
	for(let i = 0; i < SCALE_UNITS.length; i++) {
		if(scaleText == SCALE_UNITS[i][1])
			return [SCALE_UNITS[i][0], unitsText];
	}
	return [1.0,scaleText+unitsText]; //time values (s) will end up here
}

/**
 * Finds the desired scale from data.
 * Scale is one of SCALE_TEXT, SCALE_TIME or SCALE_UNITS
 * Returns an index to the scale.
 **/
function rescaleFactor(data, attribute, scale, existingScale) {
	if(typeof existingScale == 'undefined') existingScale = 1.0;
	let scaleFactor = 1.0;
	//we want a scale factor based on the range
	//that minimises the number of digits to reach 3 s.f.

	let max = Math.abs(data[0][attribute]);
	//let min = max;
	for(let i = 1; i < data.length; i++) {
		let v = Math.abs(data[i][attribute]);
		if(v > max) max = v;
		//if(v != 0 && (v < min || min == 0)) min = v;
	}
	if(isNaN(max) || max == 0)
		return -1;
	if(max >= 1.0 && max < 1000) {
		//the current scale is reasonable
		scaleFactor = existingScale;
	}
	else {
		max *= existingScale;
		//TODO: pick a scale that will either raise or reduce max so its digit length is minimised
		// ideally in range 0-9 if there is nothing past the decimal. How to check this?
		// otherwise... 0-99 then 0-999 then 0-9.9  then 0-99.9 or 0-9.99 (how to pick?)
		scaleFactor = max/9.999;
	}
	
	//now find the best index
	let bestDistance = 0.0;
	let bestIndex = -1;
	for(let i = 0; i < scale.length; i++) {
		let d = Math.abs(Math.log(scale[i][0]) - Math.log(scaleFactor));
		if(bestIndex == -1 || d < bestDistance) {
			bestDistance = d;
			bestIndex = i;
		}
	}
	console.log("best at "+bestIndex+" with distance "+bestDistance+" = "+scale[bestIndex][0]+" from "+scaleFactor);
	return bestIndex;
}



