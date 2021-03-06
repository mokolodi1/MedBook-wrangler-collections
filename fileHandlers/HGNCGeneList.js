// TODO: specify options instead of a blob_id
function HGNCGeneList (blob_id) {
  console.log("blob_id:", blob_id);
  TabSeperatedFile.call(this, {
    blob_id: blob_id
  });
}

HGNCGeneList.prototype = Object.create(TabSeperatedFile.prototype);
HGNCGeneList.prototype.constructor = HGNCGeneList;

// '"first", second, "third"' ==> ["first", "second", "third"]
function makeArray(obj, attribute) {
  var matches = [];

  var originalValue = obj[attribute];
  if (originalValue) {
    // all of the values are either in quotes or not in quotes
    var inQuotes = originalValue.match(/"[^"]+"/g);
    if (inQuotes) {
      for (var index in inQuotes) {
        var value = inQuotes[index];

        // trim off the quotes on either end
        matches.push(value.slice(1, value.length - 1));
      }
    } else {
      var split = originalValue.split(",");
      _.each(split, function (value) {
        matches.push(value.trim());
      });
    }

    // switch from string to array in original object
    obj[attribute] = matches;
  }
}

HGNCGeneList.prototype.parseLine = function (brokenTabs, lineNumber, line) {
  if (lineNumber % 1000 === 0) {
    console.log("lineNumber:", lineNumber);
  }

  this.ensureRectangular.call(this, brokenTabs, lineNumber);

  if (lineNumber === 1) { // header line
    // TODO: add non-required-ness
    var headerMappings = {
      gene_label: "Approved Symbol",
      gene_name: "Approved Name",
      previous_names: "Previous Name",
      previous_labels: "Previous Symbols",
      synonym_labels: "Synonyms",
      synonym_names: "Name Synonyms",
      chromosome: "Chromosome",
      locus_type: "Locus Type",
      locus_group: "Locus Group",
      hgnc_id: "HGNC ID",
      status: "Status", // NOTE: this field is removed before inserting
    };

    this.columnMappings = _.mapObject(headerMappings, function (value) {
      var index = brokenTabs.indexOf(value);
      if (index === -1) {
        throw new Error("Header column not found: " + value);
      }
      return index;
    });

    console.log("this.columnMappings:", this.columnMappings);
    this.genesCreated = 0;
  } else { // rest of file
    var geneObject = {};

    _.mapObject(this.columnMappings, function (columnIndex, attribute) {
      var columnValue = brokenTabs[columnIndex];
      if (columnValue !== "") {
        geneObject[attribute] = columnValue;
      }
    });

    // only insert if approved
    if (geneObject.status === "Approved") {
      geneObject.status = undefined;
      makeArray(geneObject, "previous_names");
      makeArray(geneObject, "previous_labels");
      makeArray(geneObject, "synonym_labels");
      makeArray(geneObject, "synonym_names");
      Genes.insert(geneObject);
      this.genesCreated += 1;
    }

  }
};

HGNCGeneList.prototype.endOfFile = function () {
  return {
    genesCreated: this.genesCreated
  };
};

WranglerFileTypes.HGNCGeneList = HGNCGeneList;
