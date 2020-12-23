# Figurative API

[#Report setup](Report setup)
* [#DataSet](Dataset)
* [#Palette](Palette)
* [#Figures](Figures)
[#Chart declarations](Chart declarations)
* [#Figure options](Figure)
* [#Generic options](Generic options)
* [#Charts](Charts)
** [#Distribution plot](Distribution plot)
** [#Histogram](Histogram)
** [#Scatter plot](Scatter plot)

[#Hierarchical data](Hierarchical data)
* [#Partitioning](Partitioning)
* [#Partition](Partition)

## Report setup

### DataSet
A wrapper for a list of data that maintains the selection state. This is also the root of the data hierarchy.

**Constructor:** DataSet(data)
> data: a list of Objects with the same property names
---
**Members:**
attributes []String
> The names of properties in the data, excluding id and label
children   []Partitioning
>  Any Paritionings of this DataSet - describing that data hierarchy
data       []Object
> The data objects for this DataSet
listeners  []Visualisation
> All plots that need to be notified of data selection updates
selected   Number
> A value from 0 to 1.0 representing the proportion of the data that is currently selected
units      Object
> Describes the metric scaling (if any) and units for each attribute.
> Attribute names map to Objects of {scale:<String>, units:<String>}, for example where milliseconds would be {scale:"m",units:"s}.
---
**Methods:**
rescale(deleteOld)
> Rescales all attributes, updating the *units* property of the DataSet. This also adds new properties to each datum with trailing parentheses removed, e.g "distance (m)" will add a new property "distance".
> If deleteOld is true, old property names are removed from each datum.

deselect(deselectedData)
> Deselects all datum from deselectedData that are in this DataSet.
select(selectedData)
> Selects all datum from selectedData that are in this DataSet.

withUnits(attribute) String
> Returns a String for the given attribute including scale and units in parentheses.
> Typically used when building axis labels.

partitionByField(field) DataSet
> Produces a Partitioning based on unique values of the *field* property in the data.
partitionToBins(field,minBins,maxBins) DataSet
> Produces a Partitioning of a numeric field into bins. Used, for example, to create Partitionings for histograms.
> If min and max bins are defined the number of bins will be restricted to this range, otherwise the Freedmen-Diaconis method will be used to determine the number of bins.

### Palette

Constructor:
Palette(colourScheme)

Methods:
custom(data,attribute,values,labels)
discrete(data,attribute,fixed)
numeric(data,attribute)

getColour(datum)
getSelectedColour(datum)

generateKey()
getNames()

### Figure

### Key

## Chart declarations
Example declaration. Describe parts.

### Figures

###
## Hierarchical data

### Partitioning

### Partition
